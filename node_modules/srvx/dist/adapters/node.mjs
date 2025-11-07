import { splitSetCookieString } from "../_chunks/dist-BRKJ6i_Z.mjs";
import { createWaitUntil, fmtURL, printListening, resolvePortAndHost, resolveTLSOptions } from "../_chunks/_utils-DEm1vdc3.mjs";
import { wrapFetch } from "../_chunks/_middleware-z4fpJ-o6.mjs";
import { lazyInherit } from "../_chunks/_inherit-aIijG5gM.mjs";
import { FastURL$1 as FastURL } from "../_chunks/_url-6S_VTq5O.mjs";
import { NodeRequestHeaders, NodeResponse, NodeResponseHeaders } from "../_chunks/response-DKBPm3qF.mjs";
import { errorPlugin } from "../_chunks/_plugins-BuL6RXOq.mjs";

//#region src/adapters/_node/send.ts
async function sendNodeResponse(nodeRes, webRes) {
	if (!webRes) {
		nodeRes.statusCode = 500;
		return endNodeResponse(nodeRes);
	}
	if (webRes.nodeResponse) {
		const res = webRes.nodeResponse();
		writeHead(nodeRes, res.status, res.statusText, res.headers.flat());
		if (res.body) {
			if (res.body instanceof ReadableStream) return streamBody(res.body, nodeRes);
			else if (typeof res.body?.pipe === "function") {
				res.body.pipe(nodeRes);
				return new Promise((resolve) => nodeRes.on("close", resolve));
			}
			nodeRes.write(res.body);
		}
		return endNodeResponse(nodeRes);
	}
	const headerEntries = [];
	for (const [key, value] of webRes.headers) if (key === "set-cookie") for (const setCookie of splitSetCookieString(value)) headerEntries.push(["set-cookie", setCookie]);
	else headerEntries.push([key, value]);
	writeHead(nodeRes, webRes.status, webRes.statusText, headerEntries.flat());
	return webRes.body ? streamBody(webRes.body, nodeRes) : endNodeResponse(nodeRes);
}
function writeHead(nodeRes, status, statusText, headers) {
	if (!nodeRes.headersSent) if (nodeRes.req?.httpVersion === "2.0") nodeRes.writeHead(status, headers.flat());
	else nodeRes.writeHead(status, statusText, headers.flat());
}
function endNodeResponse(nodeRes) {
	return new Promise((resolve) => nodeRes.end(resolve));
}
function streamBody(stream, nodeRes) {
	if (nodeRes.destroyed) {
		stream.cancel();
		return;
	}
	const reader = stream.getReader();
	function streamCancel(error) {
		reader.cancel(error).catch(() => {});
		if (error) nodeRes.destroy(error);
	}
	function streamHandle({ done, value }) {
		try {
			if (done) nodeRes.end();
			else if (nodeRes.write(value)) reader.read().then(streamHandle, streamCancel);
			else nodeRes.once("drain", () => reader.read().then(streamHandle, streamCancel));
		} catch (error) {
			streamCancel(error instanceof Error ? error : void 0);
		}
	}
	nodeRes.on("close", streamCancel);
	nodeRes.on("error", streamCancel);
	reader.read().then(streamHandle, streamCancel);
	return reader.closed.finally(() => {
		nodeRes.off("close", streamCancel);
		nodeRes.off("error", streamCancel);
	});
}

//#endregion
//#region src/adapters/_node/url.ts
var NodeRequestURL = class extends FastURL {
	#req;
	constructor({ req }) {
		const path = req.url || "/";
		if (path[0] === "/") {
			const qIndex = path.indexOf("?");
			const pathname = qIndex === -1 ? path : path?.slice(0, qIndex) || "/";
			const search = qIndex === -1 ? "" : path?.slice(qIndex) || "";
			const host = req.headers.host || req.headers[":authority"] || `${req.socket.localFamily === "IPv6" ? "[" + req.socket.localAddress + "]" : req.socket.localAddress}:${req.socket?.localPort || "80"}`;
			const protocol = req.socket?.encrypted || req.headers["x-forwarded-proto"] === "https" || req.headers[":scheme"] === "https" ? "https:" : "http:";
			super({
				protocol,
				host,
				pathname,
				search
			});
		} else super(path);
		this.#req = req;
	}
	get pathname() {
		return super.pathname;
	}
	set pathname(value) {
		this._url.pathname = value;
		this.#req.url = this._url.pathname + this._url.search;
	}
};

//#endregion
//#region src/adapters/_node/request.ts
const NodeRequest = /* @__PURE__ */ (() => {
	let Readable;
	const NativeRequest = globalThis._Request ??= globalThis.Request;
	const PatchedRequest = class Request$1 extends NativeRequest {
		static _srvx = true;
		static [Symbol.hasInstance](instance) {
			return instance instanceof NativeRequest;
		}
		constructor(input, options) {
			if (typeof input === "object" && "_request" in input) input = input._request;
			if ((options?.body)?.getReader !== void 0) options.duplex ??= "half";
			super(input, options);
		}
	};
	if (!globalThis.Request._srvx) globalThis.Request = PatchedRequest;
	class Request {
		_node;
		_url;
		runtime;
		#request;
		#headers;
		#abortSignal;
		constructor(ctx) {
			this._node = ctx;
			this._url = new NodeRequestURL({ req: ctx.req });
			this.runtime = {
				name: "node",
				node: ctx
			};
		}
		get ip() {
			return this._node.req.socket?.remoteAddress;
		}
		get method() {
			return this._node.req.method || "GET";
		}
		get url() {
			return this._url.href;
		}
		get headers() {
			return this.#headers ||= new NodeRequestHeaders(this._node);
		}
		get signal() {
			if (!this.#abortSignal) {
				this.#abortSignal = new AbortController();
				this._node.req.once("close", () => {
					this.#abortSignal?.abort();
				});
			}
			return this.#abortSignal.signal;
		}
		get _request() {
			if (!this.#request) {
				const method = this.method;
				const hasBody = !(method === "GET" || method === "HEAD");
				if (hasBody && !Readable) Readable = globalThis.process.getBuiltinModule("node:stream").Readable;
				this.#request = new PatchedRequest(this.url, {
					method,
					headers: this.headers,
					signal: this.signal,
					body: hasBody ? Readable.toWeb(this._node.req) : void 0
				});
			}
			return this.#request;
		}
	}
	lazyInherit(Request.prototype, NativeRequest.prototype, "_request");
	Object.setPrototypeOf(Request.prototype, NativeRequest.prototype);
	return Request;
})();

//#endregion
//#region src/adapters/node.ts
function serve(options) {
	return new NodeServer(options);
}
function toNodeHandler(fetchHandler) {
	return (nodeReq, nodeRes) => {
		const request = new NodeRequest({
			req: nodeReq,
			res: nodeRes
		});
		const res = fetchHandler(request);
		return res instanceof Promise ? res.then((resolvedRes) => sendNodeResponse(nodeRes, resolvedRes)) : sendNodeResponse(nodeRes, res);
	};
}
var NodeServer = class {
	runtime = "node";
	options;
	node;
	serveOptions;
	fetch;
	#isSecure;
	#listeningPromise;
	#wait;
	constructor(options) {
		this.options = {
			...options,
			middleware: [...options.middleware || []]
		};
		for (const plugin of options.plugins || []) plugin(this);
		errorPlugin(this);
		const fetchHandler = this.fetch = wrapFetch(this);
		this.#wait = createWaitUntil();
		const handler = (nodeReq, nodeRes) => {
			const request = new NodeRequest({
				req: nodeReq,
				res: nodeRes
			});
			request.waitUntil = this.#wait.waitUntil;
			const res = fetchHandler(request);
			return res instanceof Promise ? res.then((resolvedRes) => sendNodeResponse(nodeRes, resolvedRes)) : sendNodeResponse(nodeRes, res);
		};
		const tls = resolveTLSOptions(this.options);
		const { port, hostname: host } = resolvePortAndHost(this.options);
		this.serveOptions = {
			port,
			host,
			exclusive: !this.options.reusePort,
			...tls ? {
				cert: tls.cert,
				key: tls.key,
				passphrase: tls.passphrase
			} : {},
			...this.options.node
		};
		let server;
		this.#isSecure = !!this.serveOptions.cert && this.options.protocol !== "http";
		const isHttp2 = this.options.node?.http2 ?? this.#isSecure;
		if (isHttp2) if (this.#isSecure) {
			const { createSecureServer } = process.getBuiltinModule("node:http2");
			server = createSecureServer({
				allowHTTP1: true,
				...this.serveOptions
			}, handler);
		} else throw new Error("node.http2 option requires tls certificate!");
		else if (this.#isSecure) {
			const { createServer } = process.getBuiltinModule("node:https");
			server = createServer(this.serveOptions, handler);
		} else {
			const { createServer } = process.getBuiltinModule("node:http");
			server = createServer(this.serveOptions, handler);
		}
		this.node = {
			server,
			handler
		};
		if (!options.manual) this.serve();
	}
	serve() {
		if (this.#listeningPromise) return Promise.resolve(this.#listeningPromise).then(() => this);
		this.#listeningPromise = new Promise((resolve) => {
			this.node.server.listen(this.serveOptions, () => {
				printListening(this.options, this.url);
				resolve();
			});
		});
	}
	get url() {
		const addr = this.node?.server?.address();
		if (!addr) return;
		return typeof addr === "string" ? addr : fmtURL(addr.address, addr.port, this.#isSecure);
	}
	ready() {
		return Promise.resolve(this.#listeningPromise).then(() => this);
	}
	async close(closeAll) {
		await Promise.all([this.#wait.wait(), new Promise((resolve, reject) => {
			const server = this.node?.server;
			if (!server) return resolve();
			if (closeAll && "closeAllConnections" in server) server.closeAllConnections();
			server.close((error) => error ? reject(error) : resolve());
		})]);
	}
};

//#endregion
export { NodeResponse as FastResponse, FastURL, NodeRequest, NodeRequestHeaders, NodeResponse, NodeResponseHeaders, sendNodeResponse, serve, toNodeHandler };