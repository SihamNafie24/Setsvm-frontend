import { createWaitUntil, fmtURL, printListening, resolvePortAndHost, resolveTLSOptions } from "../_chunks/_utils-DEm1vdc3.mjs";
import { wrapFetch } from "../_chunks/_middleware-z4fpJ-o6.mjs";
import "../_chunks/_inherit-aIijG5gM.mjs";
import { FastURL$1 as FastURL } from "../_chunks/_url-6S_VTq5O.mjs";

//#region src/adapters/bun.ts
const FastResponse = Response;
function serve(options) {
	return new BunServer(options);
}
var BunServer = class {
	runtime = "bun";
	options;
	bun = {};
	serveOptions;
	fetch;
	#wait;
	constructor(options) {
		this.options = {
			...options,
			middleware: [...options.middleware || []]
		};
		for (const plugin of options.plugins || []) plugin(this);
		const fetchHandler = wrapFetch(this);
		this.#wait = createWaitUntil();
		this.fetch = (request, server) => {
			Object.defineProperties(request, {
				waitUntil: { value: this.#wait.waitUntil },
				runtime: {
					enumerable: true,
					value: {
						name: "bun",
						bun: { server }
					}
				},
				ip: {
					enumerable: true,
					get() {
						return server?.requestIP(request)?.address;
					}
				}
			});
			return fetchHandler(request);
		};
		const tls = resolveTLSOptions(this.options);
		this.serveOptions = {
			...resolvePortAndHost(this.options),
			reusePort: this.options.reusePort,
			error: this.options.error,
			...this.options.bun,
			tls: {
				cert: tls?.cert,
				key: tls?.key,
				passphrase: tls?.passphrase,
				...this.options.bun?.tls
			},
			fetch: this.fetch
		};
		if (!options.manual) this.serve();
	}
	serve() {
		if (!this.bun.server) this.bun.server = Bun.serve(this.serveOptions);
		printListening(this.options, this.url);
		return Promise.resolve(this);
	}
	get url() {
		const server = this.bun?.server;
		if (!server) return;
		const address = server.address;
		if (address) return fmtURL(address.address, address.port, server.protocol === "https");
		return server.url.href;
	}
	ready() {
		return Promise.resolve(this);
	}
	async close(closeAll) {
		await Promise.all([this.#wait.wait(), Promise.resolve(this.bun?.server?.stop(closeAll))]);
	}
};

//#endregion
export { FastResponse, FastURL, serve };