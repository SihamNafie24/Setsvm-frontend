import { NullProtoObj as EmptyObject, addRoute, createRouter, findRoute, routeToRegExp } from "rou3";
import { FastResponse, FastURL } from "srvx";
import { toNodeHandler } from "srvx/node";
import { parse, parseSetCookie, serialize, splitSetCookieString } from "cookie-es";

//#region src/_entries/_common.ts
function freezeApp(app) {
	app.config = Object.freeze(app.config);
	app._addRoute = () => {
		throw new Error("Cannot add routes after the server init.");
	};
}

//#endregion
//#region src/types/h3.ts
function definePlugin(def) {
	return (opts) => (h3) => def(h3, opts);
}

//#endregion
//#region src/event.ts
var H3Event = class {
	/**
	* Access to the H3 application instance.
	*/
	app;
	/**
	* Incoming HTTP request info.
	*
	* [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Request)
	*/
	req;
	/**
	* Access to the parsed request URL.
	*
	* [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URL)
	*/
	url;
	/**
	* Event context.
	*/
	context;
	/**
	* @internal
	*/
	static __is_event__ = true;
	/**
	* @internal
	*/
	_res;
	constructor(req, context, app) {
		this.context = context || req.context || new EmptyObject();
		this.req = req;
		this.app = app;
		const _url = req._url;
		this.url = _url && _url instanceof URL ? _url : new FastURL(req.url);
	}
	/**
	* Prepared HTTP response.
	*/
	get res() {
		if (!this._res) this._res = new H3EventResponse();
		return this._res;
	}
	/**
	* Access to runtime specific additional context.
	*
	*/
	get runtime() {
		return this.req.runtime;
	}
	/**
	* Tell the runtime about an ongoing operation that shouldn't close until the promise resolves.
	*/
	waitUntil(promise) {
		this.req.waitUntil?.(promise);
	}
	toString() {
		return `[${this.req.method}] ${this.req.url}`;
	}
	toJSON() {
		return this.toString();
	}
	/**
	* Access to the raw Node.js req/res objects.
	*
	* @deprecated Use `event.runtime.{node|deno|bun|...}.` instead.
	*/
	get node() {
		return this.req.runtime?.node;
	}
	/**
	* Access to the incoming request headers.
	*
	* @deprecated Use `event.req.headers` instead.
	*
	*/
	get headers() {
		return this.req.headers;
	}
	/**
	* Access to the incoming request url (pathname+search).
	*
	* @deprecated Use `event.url.pathname + event.url.search` instead.
	*
	* Example: `/api/hello?name=world`
	* */
	get path() {
		return this.url.pathname + this.url.search;
	}
	/**
	* Access to the incoming request method.
	*
	* @deprecated Use `event.req.method` instead.
	*/
	get method() {
		return this.req.method;
	}
};
var H3EventResponse = class {
	status;
	statusText;
	_headers;
	get headers() {
		if (!this._headers) this._headers = new Headers();
		return this._headers;
	}
};

//#endregion
//#region src/utils/sanitize.ts
const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
/**
* Make sure the status message is safe to use in a response.
*
* Allowed characters: horizontal tabs, spaces or visible ascii characters: https://www.rfc-editor.org/rfc/rfc7230#section-3.1.2
*/
function sanitizeStatusMessage(statusMessage = "") {
	return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
/**
* Make sure the status code is a valid HTTP status code.
*/
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
	if (!statusCode) return defaultStatusCode;
	if (typeof statusCode === "string") statusCode = +statusCode;
	if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
	return statusCode;
}

//#endregion
//#region src/error.ts
/**
* HTTPError
*/
var HTTPError = class HTTPError extends Error {
	get name() {
		return "HTTPError";
	}
	/**
	* HTTP status code in range [200...599]
	*/
	status;
	/**
	* HTTP status text
	*
	* **NOTE:** This should be short (max 512 to 1024 characters).
	* Allowed characters are tabs, spaces, visible ASCII characters, and extended characters (byte value 128–255).
	*
	* **TIP:** Use `message` for longer error descriptions in JSON body.
	*/
	statusText;
	/**
	* Additional HTTP headers to be sent in error response.
	*/
	headers;
	/**
	* Original error object that caused this error.
	*/
	cause;
	/**
	* Additional data attached in the error JSON body under `data` key.
	*/
	data;
	/**
	* Additional top level JSON body properties to attach in the error JSON body.
	*/
	body;
	/**
	* Flag to indicate that the error was not handled by the application.
	*
	* Unhandled error stack trace, data and message are hidden in non debug mode for security reasons.
	*/
	unhandled;
	/**
	* Check if the input is an instance of HTTPError using its constructor name.
	*
	* It is safer than using `instanceof` because it works across different contexts (e.g., if the error was thrown in a different module).
	*/
	static isError(input) {
		return input instanceof Error && input?.name === "HTTPError";
	}
	/**
	* Create a new HTTPError with the given status code and optional status text and details.
	*
	* @example
	*
	* HTTPError.status(404)
	* HTTPError.status(418, "I'm a teapot")
	* HTTPError.status(403, "Forbidden", { message: "Not authenticated" })
	*/
	static status(status, statusText, details) {
		return new HTTPError({
			...details,
			statusText,
			status
		});
	}
	constructor(arg1, arg2) {
		let messageInput;
		let details;
		if (typeof arg1 === "string") {
			messageInput = arg1;
			details = arg2;
		} else details = arg1;
		const status = sanitizeStatusCode(details?.status || (details?.cause)?.status || details?.status || details?.statusCode, 500);
		const statusText = sanitizeStatusMessage(details?.statusText || (details?.cause)?.statusText || details?.statusText || details?.statusMessage);
		const message = messageInput || details?.message || (details?.cause)?.message || details?.statusText || details?.statusMessage || [
			"HTTPError",
			status,
			statusText
		].filter(Boolean).join(" ");
		super(message, { cause: details });
		this.cause = details;
		Error.captureStackTrace?.(this, this.constructor);
		this.status = status;
		this.statusText = statusText || void 0;
		const rawHeaders = details?.headers || (details?.cause)?.headers;
		this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
		this.unhandled = details?.unhandled ?? (details?.cause)?.unhandled ?? void 0;
		this.data = details?.data;
		this.body = details?.body;
	}
	/**
	* @deprecated Use `status`
	*/
	get statusCode() {
		return this.status;
	}
	/**
	* @deprecated Use `statusText`
	*/
	get statusMessage() {
		return this.statusText;
	}
	toJSON() {
		const unhandled = this.unhandled;
		return {
			status: this.status,
			statusText: this.statusText,
			unhandled,
			message: unhandled ? "HTTPError" : this.message,
			data: unhandled ? void 0 : this.data,
			...unhandled ? void 0 : this.body
		};
	}
};

//#endregion
//#region src/utils/internal/object.ts
/**
* Checks if a certain input has a given property.
* @param obj - The input to check.
* @param prop - The property to check for.
* @returns A boolean indicating whether the input is an object and has the property.
*/
function hasProp(obj, prop) {
	try {
		return prop in obj;
	} catch {
		return false;
	}
}
function isJSONSerializable(value, _type) {
	if (value === null || value === void 0) return true;
	if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
	if (typeof value.toJSON === "function") return true;
	if (Array.isArray(value)) return true;
	if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
	if (value instanceof EmptyObject) return true;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

//#endregion
//#region src/response.ts
const kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
const kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
	if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
	const response = prepareResponse(val, event, config);
	if (typeof response?.then === "function") return toResponse(response, event, config);
	const { onResponse: onResponse$1 } = config;
	return onResponse$1 ? Promise.resolve(onResponse$1(response, event)).then(() => response) : response;
}
function prepareResponse(val, event, config, nested) {
	if (val === kHandled) return new FastResponse(null);
	if (val === kNotFound) val = new HTTPError({
		status: 404,
		message: `Cannot find any route matching [${event.req.method}] ${event.url}`
	});
	if (val && val instanceof Error) {
		const isHTTPError = HTTPError.isError(val);
		const error = isHTTPError ? val : new HTTPError(val);
		if (!isHTTPError) {
			error.unhandled = true;
			if (val?.stack) error.stack = val.stack;
		}
		if (error.unhandled && !config.silent) console.error(error);
		const { onError: onError$1 } = config;
		return onError$1 && !nested ? Promise.resolve(onError$1(error, event)).catch((error$1) => error$1).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug);
	}
	const eventHeaders = event.res._headers;
	if (!(val instanceof Response)) {
		const res = prepareResponseBody(val, event, config);
		const status = event.res.status;
		return new FastResponse(nullBody(event.req.method, status) ? null : res.body, {
			status,
			statusText: event.res.statusText,
			headers: res.headers && eventHeaders ? mergeHeaders$1(res.headers, eventHeaders) : res.headers || eventHeaders
		});
	}
	if (!eventHeaders) return val;
	return new FastResponse(nullBody(event.req.method, val.status) ? null : val.body, {
		status: val.status,
		statusText: val.statusText,
		headers: mergeHeaders$1(eventHeaders, val.headers)
	});
}
function mergeHeaders$1(base, merge) {
	const mergedHeaders = new Headers(base);
	for (const [name, value] of merge) if (name === "set-cookie") mergedHeaders.append(name, value);
	else mergedHeaders.set(name, value);
	return mergedHeaders;
}
const emptyHeaders = /* @__PURE__ */ new Headers({ "content-length": "0" });
const jsonHeaders = /* @__PURE__ */ new Headers({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
	if (val === null || val === void 0) return {
		body: "",
		headers: emptyHeaders
	};
	const valType = typeof val;
	if (valType === "string") return { body: val };
	if (val instanceof Uint8Array) {
		event.res.headers.set("content-length", val.byteLength.toString());
		return { body: val };
	}
	if (isJSONSerializable(val, valType)) return {
		body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
		headers: jsonHeaders
	};
	if (valType === "bigint") return {
		body: val.toString(),
		headers: jsonHeaders
	};
	if (val instanceof Blob) {
		const headers = {
			"content-type": val.type,
			"content-length": val.size.toString()
		};
		let filename = val.name;
		if (filename) {
			filename = encodeURIComponent(filename);
			headers["content-disposition"] = `filename="${filename}"; filename*=UTF-8''${filename}`;
		}
		return {
			body: val.stream(),
			headers
		};
	}
	if (valType === "symbol") return { body: val.toString() };
	if (valType === "function") return { body: `${val.name}()` };
	return { body: val };
}
function nullBody(method, status) {
	return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug) {
	return new FastResponse(JSON.stringify({
		...error.toJSON(),
		stack: debug && error.stack ? error.stack.split("\n").map((l) => l.trim()) : void 0
	}, void 0, debug ? 2 : void 0), {
		status: error.status,
		statusText: error.statusText,
		headers: error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : jsonHeaders
	});
}

//#endregion
//#region src/middleware.ts
function defineMiddleware(input) {
	return input;
}
function normalizeMiddleware(input, opts = {}) {
	const matcher = createMatcher(opts);
	if (!matcher && (input.length > 1 || input.constructor?.name === "AsyncFunction")) return input;
	return (event, next) => {
		if (matcher && !matcher(event)) return next();
		const res = input(event, next);
		return res === void 0 || res === kNotFound ? next() : res;
	};
}
function createMatcher(opts) {
	if (!opts.route && !opts.method && !opts.match) return void 0;
	const routeMatcher = opts.route ? routeToRegExp(opts.route) : void 0;
	const method = opts.method?.toUpperCase();
	return (event) => {
		if (method && event.req.method !== method) return false;
		if (opts.match && !opts.match(event)) return false;
		if (!routeMatcher) return true;
		const match = event.url.pathname.match(routeMatcher);
		if (!match) return false;
		if (match.groups) event.context.middlewareParams = {
			...event.context.middlewareParams,
			...match.groups
		};
		return true;
	};
}
function callMiddleware(event, middleware, handler, index = 0) {
	if (index === middleware.length) return handler(event);
	const fn = middleware[index];
	let nextCalled;
	let nextResult;
	const next = () => {
		if (nextCalled) return nextResult;
		nextCalled = true;
		nextResult = callMiddleware(event, middleware, handler, index + 1);
		return nextResult;
	};
	const ret = fn(event, next);
	return ret === void 0 || ret === kNotFound ? next() : typeof ret?.then === "function" ? ret.then((resolved) => resolved === void 0 || resolved === kNotFound ? next() : resolved) : ret;
}

//#endregion
//#region src/utils/internal/query.ts
const plusRegex = /\+/g;
function parseQuery(input) {
	const params = new EmptyObject();
	if (!input || input === "?") return params;
	const inputLength = input.length;
	let key = "";
	let value = "";
	let startingIndex = -1;
	let equalityIndex = -1;
	let shouldDecodeKey = false;
	let shouldDecodeValue = false;
	let keyHasPlus = false;
	let valueHasPlus = false;
	let hasBothKeyValuePair = false;
	let c = 0;
	for (let i = 0; i < inputLength + 1; i++) {
		c = i === inputLength ? 38 : input.charCodeAt(i);
		switch (c) {
			case 38: {
				hasBothKeyValuePair = equalityIndex > startingIndex;
				if (!hasBothKeyValuePair) equalityIndex = i;
				key = input.slice(startingIndex + 1, equalityIndex);
				if (hasBothKeyValuePair || key.length > 0) {
					if (keyHasPlus) key = key.replace(plusRegex, " ");
					if (shouldDecodeKey) try {
						key = decodeURIComponent(key);
					} catch {}
					if (hasBothKeyValuePair) {
						value = input.slice(equalityIndex + 1, i);
						if (valueHasPlus) value = value.replace(plusRegex, " ");
						if (shouldDecodeValue) try {
							value = decodeURIComponent(value);
						} catch {}
					}
					const currentValue = params[key];
					if (currentValue === void 0) params[key] = value;
					else if (Array.isArray(currentValue)) currentValue.push(value);
					else params[key] = [currentValue, value];
				}
				value = "";
				startingIndex = i;
				equalityIndex = i;
				shouldDecodeKey = false;
				shouldDecodeValue = false;
				keyHasPlus = false;
				valueHasPlus = false;
				break;
			}
			case 61: {
				if (equalityIndex <= startingIndex) equalityIndex = i;
				else shouldDecodeValue = true;
				break;
			}
			case 43: {
				if (equalityIndex > startingIndex) valueHasPlus = true;
				else keyHasPlus = true;
				break;
			}
			case 37: {
				if (equalityIndex > startingIndex) shouldDecodeValue = true;
				else shouldDecodeKey = true;
				break;
			}
		}
	}
	return params;
}

//#endregion
//#region src/utils/internal/validate.ts
async function validateData(data, fn) {
	if ("~standard" in fn) {
		const result = await fn["~standard"].validate(data);
		if (result.issues) throw createValidationError({
			message: "Validation failed",
			issues: result.issues
		});
		return result.value;
	}
	try {
		const res = await fn(data);
		if (res === false) throw createValidationError({ message: "Validation failed" });
		if (res === true) return data;
		return res ?? data;
	} catch (error) {
		throw createValidationError(error);
	}
}
const reqBodyKeys = new Set([
	"body",
	"text",
	"formData",
	"arrayBuffer"
]);
function validatedRequest(req, validate) {
	if (validate.headers) {
		const validatedheaders = syncValidate("headers", Object.fromEntries(req.headers.entries()), validate.headers);
		for (const [key, value] of Object.entries(validatedheaders)) req.headers.set(key, value);
	}
	if (!validate.body) return req;
	return new Proxy(req, { get(_target, prop) {
		if (validate.body) {
			if (prop === "json") return () => req.json().then((data) => validate.body["~standard"].validate(data)).then((result) => result.issues ? Promise.reject(createValidationError(result)) : result.value);
			else if (reqBodyKeys.has(prop)) throw new TypeError(`Cannot access .${prop} on request with JSON validation enabled. Use .json() instead.`);
		}
		return Reflect.get(req, prop);
	} });
}
function validatedURL(url, validate) {
	if (!validate.query) return url;
	const validatedQuery = syncValidate("query", Object.fromEntries(url.searchParams.entries()), validate.query);
	for (const [key, value] of Object.entries(validatedQuery)) url.searchParams.set(key, value);
	return url;
}
function syncValidate(type, data, fn) {
	const result = fn["~standard"].validate(data);
	if (result instanceof Promise) throw new TypeError(`Asynchronous validation is not supported for ${type}`);
	if (result.issues) throw createValidationError({ issues: result.issues });
	return result.value;
}
function createValidationError(validateError) {
	return new HTTPError({
		status: 400,
		statusText: "Validation failed",
		message: validateError?.message,
		data: validateError,
		cause: validateError
	});
}

//#endregion
//#region src/utils/event.ts
/**
* Checks if the input is an H3Event object.
* @param input - The input to check.
* @returns True if the input is an H3Event object, false otherwise.
* @see H3Event
*/
function isEvent(input) {
	return input instanceof H3Event || input?.constructor?.__is_event__;
}
/**
* Checks if the input is an object with `{ req: Request }` signature.
* @param input - The input to check.
* @returns True if the input is is `{ req: Request }`
*/
function isHTTPEvent(input) {
	return input?.req instanceof Request;
}
/**
* Gets the context of the event, if it does not exists, initializes a new context on `req.context`.
*/
function getEventContext(event) {
	if (event.context) return event.context;
	event.req.context ??= {};
	return event.req.context;
}
function mockEvent(_request, options) {
	let request;
	if (typeof _request === "string") {
		let url = _request;
		if (url[0] === "/") url = `http://localhost${url}`;
		request = new Request(url, options);
	} else if (options || _request instanceof URL) request = new Request(_request, options);
	else request = _request;
	return new H3Event(request);
}

//#endregion
//#region src/utils/request.ts
/**
* Convert input into a web [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request).
*
* If input is a relative URL, it will be normalized into a full path based on headers.
*
* If input is already a Request and no options are provided, it will be returned as-is.
*/
function toRequest(input, options) {
	if (typeof input === "string") {
		let url = input;
		if (url[0] === "/") {
			const headers = options?.headers ? new Headers(options.headers) : void 0;
			const host = headers?.get("host") || "localhost";
			const proto = headers?.get("x-forwarded-proto") === "https" ? "https" : "http";
			url = `${proto}://${host}${url}`;
		}
		return new Request(url, options);
	} else if (options || input instanceof URL) return new Request(input, options);
	return input;
}
/**
* Get parsed query string object from the request URL.
*
* @example
* app.get("/", (event) => {
*   const query = getQuery(event); // { key: "value", key2: ["value1", "value2"] }
* });
*/
function getQuery(event) {
	const url = event.url || new URL(event.req.url);
	return parseQuery(url.search.slice(1));
}
/**
* Get the query param from the request URL validated with validate function.
*
* You can use a simple function to validate the query object or use a Standard-Schema compatible library like `zod` to define a schema.
*
* @example
* app.get("/", async (event) => {
*   const query = await getValidatedQuery(event, (data) => {
*     return "key" in data && typeof data.key === "string";
*   });
* });
* @example
* import { z } from "zod";
*
* app.get("/", async (event) => {
*   const query = await getValidatedQuery(
*     event,
*     z.object({
*       key: z.string(),
*     }),
*   );
* });
*/
function getValidatedQuery(event, validate) {
	const query = getQuery(event);
	return validateData(query, validate);
}
/**
* Get matched route params.
*
* If `decode` option is `true`, it will decode the matched route params using `decodeURIComponent`.
*
* @example
* app.get("/", (event) => {
*   const params = getRouterParams(event); // { key: "value" }
* });
*/
function getRouterParams(event, opts = {}) {
	const context = getEventContext(event);
	let params = context.params || {};
	if (opts.decode) {
		params = { ...params };
		for (const key in params) params[key] = decodeURIComponent(params[key]);
	}
	return params;
}
/**
* Get matched route params and validate with validate function.
*
* If `decode` option is `true`, it will decode the matched route params using `decodeURI`.
*
* You can use a simple function to validate the params object or use a Standard-Schema compatible library like `zod` to define a schema.
*
* @example
* app.get("/", async (event) => {
*   const params = await getValidatedRouterParams(event, (data) => {
*     return "key" in data && typeof data.key === "string";
*   });
* });
* @example
* import { z } from "zod";
*
* app.get("/", async (event) => {
*   const params = await getValidatedRouterParams(
*     event,
*     z.object({
*       key: z.string(),
*     }),
*   );
* });
*/
function getValidatedRouterParams(event, validate, opts = {}) {
	const routerParams = getRouterParams(event, opts);
	return validateData(routerParams, validate);
}
/**
* Get a matched route param by name.
*
* If `decode` option is `true`, it will decode the matched route param using `decodeURI`.
*
* @example
* app.get("/", (event) => {
*   const param = getRouterParam(event, "key");
* });
*/
function getRouterParam(event, name, opts = {}) {
	const params = getRouterParams(event, opts);
	return params[name];
}
/**
*
* Checks if the incoming request method is of the expected type.
*
* If `allowHead` is `true`, it will allow `HEAD` requests to pass if the expected method is `GET`.
*
* @example
* app.get("/", (event) => {
*   if (isMethod(event, "GET")) {
*     // Handle GET request
*   } else if (isMethod(event, ["POST", "PUT"])) {
*     // Handle POST or PUT request
*   }
* });
*/
function isMethod(event, expected, allowHead) {
	if (allowHead && event.req.method === "HEAD") return true;
	if (typeof expected === "string") {
		if (event.req.method === expected) return true;
	} else if (expected.includes(event.req.method)) return true;
	return false;
}
/**
* Asserts that the incoming request method is of the expected type using `isMethod`.
*
* If the method is not allowed, it will throw a 405 error with the message "HTTP method is not allowed".
*
* If `allowHead` is `true`, it will allow `HEAD` requests to pass if the expected method is `GET`.
*
* @example
* app.get("/", (event) => {
*   assertMethod(event, "GET");
*   // Handle GET request, otherwise throw 405 error
* });
*/
function assertMethod(event, expected, allowHead) {
	if (!isMethod(event, expected, allowHead)) throw new HTTPError({ status: 405 });
}
/**
* Get the request hostname.
*
* If `xForwardedHost` is `true`, it will use the `x-forwarded-host` header if it exists.
*
* If no host header is found, it will default to "localhost".
*
* @example
* app.get("/", (event) => {
*   const host = getRequestHost(event); // "example.com"
* });
*/
function getRequestHost(event, opts = {}) {
	if (opts.xForwardedHost) {
		const _header = event.req.headers.get("x-forwarded-host");
		const xForwardedHost = (_header || "").split(",").shift()?.trim();
		if (xForwardedHost) return xForwardedHost;
	}
	return event.req.headers.get("host") || "";
}
/**
* Get the request protocol.
*
* If `x-forwarded-proto` header is set to "https", it will return "https". You can disable this behavior by setting `xForwardedProto` to `false`.
*
* If protocol cannot be determined, it will default to "http".
*
* @example
* app.get("/", (event) => {
*   const protocol = getRequestProtocol(event); // "https"
* });
*/
function getRequestProtocol(event, opts = {}) {
	if (opts.xForwardedProto !== false) {
		const forwardedProto = event.req.headers.get("x-forwarded-proto");
		if (forwardedProto === "https") return "https";
		if (forwardedProto === "http") return "http";
	}
	const url = event.url || new URL(event.req.url);
	return url.protocol.slice(0, -1);
}
/**
* Generated the full incoming request URL.
*
* If `xForwardedHost` is `true`, it will use the `x-forwarded-host` header if it exists.
*
* If `xForwardedProto` is `false`, it will not use the `x-forwarded-proto` header.
*
* @example
* app.get("/", (event) => {
*   const url = getRequestURL(event); // "https://example.com/path"
* });
*/
function getRequestURL(event, opts = {}) {
	const url = new URL(event.url || event.req.url);
	url.protocol = getRequestProtocol(event, opts);
	if (opts.xForwardedHost) {
		const host = getRequestHost(event, opts);
		if (host) {
			url.host = host;
			if (!host.includes(":")) url.port = "";
		}
	}
	return url;
}
/**
* Try to get the client IP address from the incoming request.
*
* If `xForwardedFor` is `true`, it will use the `x-forwarded-for` header if it exists.
*
* If IP cannot be determined, it will default to `undefined`.
*
* @example
* app.get("/", (event) => {
*   const ip = getRequestIP(event); // "192.0.2.0"
* });
*/
function getRequestIP(event, opts = {}) {
	if (opts.xForwardedFor) {
		const _header = event.req.headers.get("x-forwarded-for");
		const xForwardedFor = (_header || "")?.split(",").shift()?.trim();
		if (xForwardedFor) return xForwardedFor;
	}
	return event.req.context?.clientAddress || event.req.ip || void 0;
}

//#endregion
//#region src/h3.ts
const H3Core = /* @__PURE__ */ (() => {
	const HTTPMethods = [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"PATCH",
		"HEAD",
		"OPTIONS",
		"CONNECT",
		"TRACE"
	];
	class H3Core$1 {
		_middleware;
		_routes = [];
		config;
		constructor(config = {}) {
			this._middleware = [];
			this.config = config;
			this.fetch = this.fetch.bind(this);
			this.request = this.request.bind(this);
			this.handler = this.handler.bind(this);
			config.plugins?.forEach((plugin) => plugin(this));
		}
		fetch(request) {
			return this._request(request);
		}
		request(_req, _init, context) {
			return this._request(toRequest(_req, _init), context);
		}
		_request(request, context) {
			const event = new H3Event(request, context, this);
			let handlerRes;
			try {
				if (this.config.onRequest) {
					const hookRes = this.config.onRequest(event);
					handlerRes = typeof hookRes?.then === "function" ? hookRes.then(() => this.handler(event)) : this.handler(event);
				} else handlerRes = this.handler(event);
			} catch (error) {
				handlerRes = Promise.reject(error);
			}
			return toResponse(handlerRes, event, this.config);
		}
		/**
		* Immediately register an H3 plugin.
		*/
		register(plugin) {
			plugin(this);
			return this;
		}
		_findRoute(_event) {}
		_addRoute(_route) {
			this._routes.push(_route);
		}
		handler(event) {
			const route = this._findRoute(event);
			if (route) {
				event.context.params = route.params;
				event.context.matchedRoute = route.data;
			}
			const middleware = route?.data.middleware ? [...this._middleware, ...route.data.middleware] : this._middleware;
			return callMiddleware(event, middleware, () => {
				return route ? route.data.handler(event) : kNotFound;
			});
		}
		mount(base, input) {
			if ("handler" in input) {
				if (input._middleware.length > 0) this._middleware.push((event, next) => {
					return event.url.pathname.startsWith(base) ? callMiddleware(event, input._middleware, next) : next();
				});
				for (const r of input._routes) this._addRoute({
					...r,
					route: base + r.route
				});
			} else {
				const fetchHandler = "fetch" in input ? input.fetch : input;
				this.all(`${base}/**`, (event) => {
					const url = new URL(event.url);
					url.pathname = url.pathname.slice(base.length) || "/";
					return fetchHandler(new Request(url, event.req));
				});
			}
			return this;
		}
		all(route, handler, opts) {
			return this.on("", route, handler, opts);
		}
		on(method, route, handler, opts) {
			const _method = (method || "").toUpperCase();
			route = new URL(route, "http://_").pathname;
			this._addRoute({
				method: _method,
				route,
				handler,
				middleware: opts?.middleware,
				meta: {
					...handler.meta,
					...opts?.meta
				}
			});
			return this;
		}
		use(arg1, arg2, arg3) {
			let route;
			let fn;
			let opts;
			if (typeof arg1 === "string") {
				route = arg1;
				fn = arg2;
				opts = arg3;
			} else {
				fn = arg1;
				opts = arg2;
			}
			this._middleware.push(normalizeMiddleware(fn, route ? {
				...opts,
				route
			} : opts));
			return this;
		}
	}
	for (const method of HTTPMethods) H3Core$1.prototype[method.toLowerCase()] = function(route, handler, opts) {
		return this.on(method, route, handler, opts);
	};
	return H3Core$1;
})();
var H3 = class extends H3Core {
	/**
	* @internal
	*/
	_rou3;
	constructor(config = {}) {
		super(config);
		this._rou3 = createRouter();
	}
	_findRoute(_event) {
		return findRoute(this._rou3, _event.req.method, _event.url.pathname);
	}
	_addRoute(_route) {
		addRoute(this._rou3, _route.method, _route.route, _route);
		super._addRoute(_route);
	}
};

//#endregion
//#region src/handler.ts
function defineHandler(arg1) {
	if (typeof arg1 === "function") return handlerWithFetch(arg1);
	const { middleware, handler, meta } = arg1;
	const _handler = handlerWithFetch(middleware?.length ? (event) => callMiddleware(event, middleware, handler) : handler);
	_handler.meta = meta;
	return _handler;
}
/**
* @experimental defineValidatedHandler is an experimental feature and API may change.
*/
function defineValidatedHandler(def) {
	if (!def.validate) return defineHandler(def);
	return defineHandler({
		...def,
		handler: (event) => {
			event.req = validatedRequest(event.req, def.validate);
			event.url = validatedURL(event.url, def.validate);
			return def.handler(event);
		}
	});
}
function handlerWithFetch(handler) {
	return Object.assign(handler, { fetch: (req) => {
		if (typeof req === "string") req = new URL(req, "http://_");
		if (req instanceof URL) req = new Request(req);
		const event = new H3Event(req);
		try {
			return Promise.resolve(toResponse(handler(event), event));
		} catch (error) {
			return Promise.resolve(toResponse(error, event));
		}
	} });
}
function dynamicEventHandler(initial) {
	let current = initial;
	return Object.assign(defineHandler((event) => current?.(event)), { set: (handler) => {
		current = handler;
	} });
}
function defineLazyEventHandler(load) {
	let _promise;
	let _resolved;
	const resolveHandler = () => {
		if (_resolved) return Promise.resolve(_resolved);
		if (!_promise) _promise = Promise.resolve(load()).then((r) => {
			const handler = r.default || r;
			if (typeof handler !== "function") throw new TypeError("Invalid lazy handler result. It should be a function:", handler);
			_resolved = { handler: r.default || r };
			return _resolved;
		});
		return _promise;
	};
	return defineHandler((event) => {
		if (_resolved) return _resolved.handler(event);
		return resolveHandler().then((r) => r.handler(event));
	});
}

//#endregion
//#region src/adapters.ts
/**
* @deprecated Since h3 v2 you can directly use `app.fetch(request, init?, context?)`
*/
function toWebHandler(app) {
	return (request, context) => {
		return Promise.resolve(app.request(request, void 0, context || request.context));
	};
}
function fromWebHandler(handler) {
	return (event) => handler(event.req, event.context);
}
function fromNodeHandler(handler) {
	if (typeof handler !== "function") throw new TypeError(`Invalid handler. It should be a function: ${handler}`);
	return (event) => {
		if (!event.runtime?.node?.res) throw new Error("[h3] Executing Node.js middleware is not supported in this server!");
		return callNodeHandler(handler, event.runtime?.node.req, event.runtime?.node.res);
	};
}
function defineNodeHandler(handler) {
	return handler;
}
function defineNodeMiddleware(handler) {
	return handler;
}
/**
* Convert H3 app instance to a NodeHandler with (IncomingMessage, ServerResponse) => void signature.
*/
function toNodeHandler$1(app) {
	return toNodeHandler(app.fetch);
}
function callNodeHandler(handler, req, res) {
	const isMiddleware = handler.length > 2;
	return new Promise((resolve, reject) => {
		res.once("close", () => resolve(kHandled));
		res.once("finish", () => resolve(kHandled));
		res.once("pipe", (stream) => resolve(stream));
		res.once("error", (error) => reject(error));
		try {
			if (isMiddleware) Promise.resolve(handler(req, res, (error) => error ? reject(new HTTPError({
				cause: error,
				unhandled: true
			})) : resolve(void 0))).catch((error) => reject(new HTTPError({
				cause: error,
				unhandled: true
			})));
			else return Promise.resolve(handler(req, res)).then(() => resolve(kHandled)).catch((error) => reject(new HTTPError({
				cause: error,
				unhandled: true
			})));
		} catch (error) {
			reject(new HTTPError({
				cause: error,
				unhandled: true
			}));
		}
	});
}

//#endregion
//#region src/utils/route.ts
/**
* Define a route as a plugin that can be registered with app.register()
*
* @example
* ```js
* import { z } from "zod";
*
* const userRoute = defineRoute({
*    method: 'POST',
*    validate: {
*      query: z.object({ id: z.string().uuid() }),
*      body: z.object({ name: z.string() }),
*    },
*    handler: (event) => {
*      return { success: true };
*    }
* });
*
* app.register(userRoute);
* ```
*/
function defineRoute(def) {
	const handler = defineValidatedHandler(def);
	return (h3) => {
		h3.on(def.method, def.route, handler);
	};
}

//#endregion
//#region src/utils/internal/encoding.ts
/**
Base64 encoding based on https://github.com/denoland/std/tree/main/encoding (modified with url compatibility)
Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
https://github.com/denoland/std/blob/main/LICENSE
*/
const textEncoder = /* @__PURE__ */ new TextEncoder();
const textDecoder = /* @__PURE__ */ new TextDecoder();
const base64Code = [
	65,
	66,
	67,
	68,
	69,
	70,
	71,
	72,
	73,
	74,
	75,
	76,
	77,
	78,
	79,
	80,
	81,
	82,
	83,
	84,
	85,
	86,
	87,
	88,
	89,
	90,
	97,
	98,
	99,
	100,
	101,
	102,
	103,
	104,
	105,
	106,
	107,
	108,
	109,
	110,
	111,
	112,
	113,
	114,
	115,
	116,
	117,
	118,
	119,
	120,
	121,
	122,
	48,
	49,
	50,
	51,
	52,
	53,
	54,
	55,
	56,
	57,
	45,
	95
];
function base64Encode(data) {
	const buff = validateBinaryLike(data);
	if (globalThis.Buffer) return globalThis.Buffer.from(buff).toString("base64url");
	const bytes = [];
	let i;
	const len = buff.length;
	for (i = 2; i < len; i += 3) bytes.push(base64Code[buff[i - 2] >> 2], base64Code[(buff[i - 2] & 3) << 4 | buff[i - 1] >> 4], base64Code[(buff[i - 1] & 15) << 2 | buff[i] >> 6], base64Code[buff[i] & 63]);
	if (i === len + 1) bytes.push(base64Code[buff[i - 2] >> 2], base64Code[(buff[i - 2] & 3) << 4]);
	if (i === len) bytes.push(base64Code[buff[i - 2] >> 2], base64Code[(buff[i - 2] & 3) << 4 | buff[i - 1] >> 4], base64Code[(buff[i - 1] & 15) << 2]);
	return String.fromCharCode(...bytes);
}
function base64Decode(b64Url) {
	if (globalThis.Buffer) return new Uint8Array(globalThis.Buffer.from(b64Url, "base64url"));
	const b64 = b64Url.replace(/-/g, "+").replace(/_/g, "/");
	const binString = atob(b64);
	const size = binString.length;
	const bytes = new Uint8Array(size);
	for (let i = 0; i < size; i++) bytes[i] = binString.charCodeAt(i);
	return bytes;
}
function validateBinaryLike(source) {
	if (typeof source === "string") return textEncoder.encode(source);
	else if (source instanceof Uint8Array) return source;
	else if (source instanceof ArrayBuffer) return new Uint8Array(source);
	throw new TypeError(`The input must be a Uint8Array, a string, or an ArrayBuffer.`);
}

//#endregion
//#region src/utils/internal/iterable.ts
/**
* The default implementation for {@link iterable}'s `serializer` argument.
* It serializes values as follows:
* - Instances of {@link String}, {@link Uint8Array} and `undefined` are returned as-is.
* - Objects are serialized through {@link JSON.stringify}.
* - Functions are serialized as `undefined`.
* - Values of type boolean, number, bigint or symbol are serialized using their `toString` function.
*
* @param value - The value to serialize to either a string or Uint8Array.
*/
function serializeIterableValue(value) {
	switch (typeof value) {
		case "string": return textEncoder.encode(value);
		case "boolean":
		case "number":
		case "bigint":
		case "symbol": return textEncoder.encode(value.toString());
		case "object": {
			if (value instanceof Uint8Array) return value;
			return textEncoder.encode(JSON.stringify(value));
		}
	}
	return new Uint8Array();
}
function coerceIterable(iterable$1) {
	if (typeof iterable$1 === "function") iterable$1 = iterable$1();
	if (Symbol.iterator in iterable$1) return iterable$1[Symbol.iterator]();
	if (Symbol.asyncIterator in iterable$1) return iterable$1[Symbol.asyncIterator]();
	return iterable$1;
}

//#endregion
//#region src/utils/response.ts
/**
* Respond with an empty payload.<br>
*
* @example
* app.get("/", (event) => noContent(event));
*
* @param event H3 event
* @param code status code to be send. By default, it is `204 No Content`.
*/
function noContent(event, code) {
	const currentStatus = event.res.status;
	if (!code && currentStatus && currentStatus !== 200) code = event.res.status;
	event.res.status = sanitizeStatusCode(code, 204);
	if (event.res.status === 204) event.res.headers.delete("content-length");
	return new FastResponse(null, event.res);
}
/**
* Send a redirect response to the client.
*
* It adds the `location` header to the response and sets the status code to 302 by default.
*
* In the body, it sends a simple HTML page with a meta refresh tag to redirect the client in case the headers are ignored.
*
* @example
* app.get("/", (event) => {
*   return redirect(event, "https://example.com");
* });
*
* @example
* app.get("/", (event) => {
*   return redirect(event, "https://example.com", 301); // Permanent redirect
* });
*/
function redirect(event, location, code = 302) {
	event.res.status = sanitizeStatusCode(code, event.res.status);
	event.res.headers.set("location", location);
	const encodedLoc = location.replace(/"/g, "%22");
	return html(event, `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`);
}
/**
* Write `HTTP/1.1 103 Early Hints` to the client.
*/
function writeEarlyHints(event, hints) {
	if (!event.runtime?.node?.res?.writeEarlyHints) return;
	return new Promise((resolve) => {
		event.runtime?.node?.res?.writeEarlyHints(hints, () => resolve());
	});
}
/**
* Iterate a source of chunks and send back each chunk in order.
* Supports mixing async work together with emitting chunks.
*
* Each chunk must be a string or a buffer.
*
* For generator (yielding) functions, the returned value is treated the same as yielded values.
*
* @param event - H3 event
* @param iterable - Iterator that produces chunks of the response.
* @param serializer - Function that converts values from the iterable into stream-compatible values.
* @template Value - Test
*
* @example
* return iterable(event, async function* work() {
*   // Open document body
*   yield "<!DOCTYPE html>\n<html><body><h1>Executing...</h1><ol>\n";
*   // Do work ...
*   for (let i = 0; i < 1000) {
*     await delay(1000);
*     // Report progress
*     yield `<li>Completed job #`;
*     yield i;
*     yield `</li>\n`;
*   }
*   // Close out the report
*   return `</ol></body></html>`;
* })
* async function delay(ms) {
*   return new Promise(resolve => setTimeout(resolve, ms));
* }
*/
function iterable(_event, iterable$1, options) {
	const serializer = options?.serializer ?? serializeIterableValue;
	const iterator = coerceIterable(iterable$1);
	return new ReadableStream({
		async pull(controller) {
			const { value, done } = await iterator.next();
			if (value !== void 0) {
				const chunk = serializer(value);
				if (chunk !== void 0) controller.enqueue(chunk);
			}
			if (done) controller.close();
		},
		cancel() {
			iterator.return?.();
		}
	});
}
/**
* Respond with HTML content.
*
* @example
* app.get("/", (event) => html(event, "<h1>Hello, World!</h1>"));
*/
function html(event, content) {
	if (!event.res.headers.has("content-type")) event.res.headers.set("content-type", "text/html; charset=utf-8");
	return content;
}

//#endregion
//#region src/utils/middleware.ts
/**
* Define a middleware that runs on each request.
*/
function onRequest(hook) {
	return async (event) => {
		await hook(event);
	};
}
/**
* Define a middleware that runs after Response is generated.
*
* You can return a new Response from the handler to replace the original response.
*/
function onResponse(hook) {
	return async (event, next) => {
		const rawBody = await next();
		const response = await toResponse(rawBody, event);
		const hookResponse = await hook(response, event);
		return hookResponse || response;
	};
}
/**
* Define a middleware that runs when an error occurs.
*
* You can return a new Response from the handler to gracefully handle the error.
*/
function onError(hook) {
	return async (event, next) => {
		try {
			return await next();
		} catch (rawError) {
			const isHTTPError = HTTPError.isError(rawError);
			const error = isHTTPError ? rawError : new HTTPError(rawError);
			if (!isHTTPError) {
				error.unhandled = true;
				if (rawError?.stack) error.stack = rawError.stack;
			}
			const hookResponse = await hook(error, event);
			if (hookResponse !== void 0) return hookResponse;
			throw error;
		}
	};
}

//#endregion
//#region src/utils/internal/proxy.ts
const PayloadMethods = new Set([
	"PATCH",
	"POST",
	"PUT",
	"DELETE"
]);
const ignoredHeaders = new Set([
	"transfer-encoding",
	"connection",
	"keep-alive",
	"upgrade",
	"expect",
	"host",
	"accept"
]);
function rewriteCookieProperty(header, map, property) {
	const _map = typeof map === "string" ? { "*": map } : map;
	return header.replace(new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"), (match, prefix, previousValue) => {
		let newValue;
		if (previousValue in _map) newValue = _map[previousValue];
		else if ("*" in _map) newValue = _map["*"];
		else return match;
		return newValue ? prefix + newValue : "";
	});
}
function mergeHeaders(defaults$1, ...inputs) {
	const _inputs = inputs.filter(Boolean);
	if (_inputs.length === 0) return defaults$1;
	const merged = new Headers(defaults$1);
	for (const input of _inputs) {
		const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
		for (const [key, value] of entries) if (value !== void 0) merged.set(key, value);
	}
	return merged;
}

//#endregion
//#region src/utils/proxy.ts
/**
* Proxy the incoming request to a target URL.
*/
async function proxyRequest(event, target, opts = {}) {
	const requestBody = PayloadMethods.has(event.req.method) ? event.req.body : void 0;
	const method = opts.fetchOptions?.method || event.req.method;
	const fetchHeaders = mergeHeaders(getProxyRequestHeaders(event, {
		host: target.startsWith("/"),
		forwardHeaders: opts.forwardHeaders,
		filterHeaders: opts.filterHeaders
	}), opts.fetchOptions?.headers, opts.headers);
	return proxy(event, target, {
		...opts,
		fetchOptions: {
			method,
			body: requestBody,
			duplex: requestBody ? "half" : void 0,
			...opts.fetchOptions,
			headers: fetchHeaders
		}
	});
}
/**
* Make a proxy request to a target URL and send the response back to the client.
*/
async function proxy(event, target, opts = {}) {
	const fetchOptions = {
		headers: opts.headers,
		...opts.fetchOptions
	};
	let response;
	try {
		response = target[0] === "/" ? await event.app.fetch(createSubRequest(event, target, fetchOptions)) : await fetch(target, fetchOptions);
	} catch (error) {
		throw new HTTPError({
			status: 502,
			cause: error
		});
	}
	event.res.statusText = sanitizeStatusMessage(response.statusText);
	const cookies = [];
	for (const [key, value] of response.headers.entries()) {
		if (key === "content-encoding") continue;
		if (key === "content-length") continue;
		if (key === "set-cookie") {
			cookies.push(...splitSetCookieString(value));
			continue;
		}
		event.res.headers.set(key, value);
	}
	if (cookies.length > 0) {
		const _cookies = cookies.map((cookie) => {
			if (opts.cookieDomainRewrite) cookie = rewriteCookieProperty(cookie, opts.cookieDomainRewrite, "domain");
			if (opts.cookiePathRewrite) cookie = rewriteCookieProperty(cookie, opts.cookiePathRewrite, "path");
			return cookie;
		});
		for (const cookie of _cookies) event.res.headers.append("set-cookie", cookie);
	}
	if (opts.onResponse) await opts.onResponse(event, response);
	return response.body;
}
/**
* Get the request headers object without headers known to cause issues when proxying.
*/
function getProxyRequestHeaders(event, opts) {
	const headers = new EmptyObject();
	for (const [name, value] of event.req.headers.entries()) {
		if (opts?.filterHeaders?.includes(name)) continue;
		if (opts?.forwardHeaders?.includes(name)) {
			headers[name] = value;
			continue;
		}
		if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
			headers[name] = value;
			continue;
		}
	}
	return headers;
}
/**
* Make a fetch request with the event's context and headers.
*/
async function fetchWithEvent(event, url, init) {
	if (url[0] !== "/") return fetch(url, init);
	return event.app.fetch(createSubRequest(event, url, {
		...init,
		headers: mergeHeaders(getProxyRequestHeaders(event, { host: true }), init?.headers)
	}));
}
function createSubRequest(event, path, init) {
	const url = new URL(path, event.url);
	const req = new Request(url, init);
	req.runtime = event.req.runtime;
	req.waitUntil = event.req.waitUntil;
	req.ip = event.req.ip;
	return req;
}

//#endregion
//#region src/utils/internal/body.ts
function parseURLEncodedBody(body) {
	const form = new URLSearchParams(body);
	const parsedForm = new EmptyObject();
	for (const [key, value] of form.entries()) if (hasProp(parsedForm, key)) {
		if (!Array.isArray(parsedForm[key])) parsedForm[key] = [parsedForm[key]];
		parsedForm[key].push(value);
	} else parsedForm[key] = value;
	return parsedForm;
}

//#endregion
//#region src/utils/body.ts
/**
* Reads request body and tries to parse using JSON.parse or URLSearchParams.
*
* @example
* app.get("/", async (event) => {
*   const body = await readBody(event);
* });
*
* @param event H3 event passed by h3 handler
* @param encoding The character encoding to use, defaults to 'utf-8'.
*
* @return {*} The `Object`, `Array`, `String`, `Number`, `Boolean`, or `null` value corresponding to the request JSON body
*/
async function readBody(event) {
	const text = await event.req.text();
	if (!text) return void 0;
	const contentType = event.req.headers.get("content-type") || "";
	if (contentType.startsWith("application/x-www-form-urlencoded")) return parseURLEncodedBody(text);
	try {
		return JSON.parse(text);
	} catch {
		throw new HTTPError({
			status: 400,
			statusText: "Bad Request",
			message: "Invalid JSON body"
		});
	}
}
/**
* Tries to read the request body via `readBody`, then uses the provided validation schema or function and either throws a validation error or returns the result.
*
* You can use a simple function to validate the body or use a Standard-Schema compatible library like `zod` to define a schema.
*
* @example
* app.get("/", async (event) => {
*   const body = await readValidatedBody(event, (body) => {
*     return typeof body === "object" && body !== null;
*   });
* });
* @example
* import { z } from "zod";
*
* app.get("/", async (event) => {
*   const objectSchema = z.object({
*     name: z.string().min(3).max(20),
*     age: z.number({ coerce: true }).positive().int(),
*   });
*   const body = await readValidatedBody(event, objectSchema);
* });
*
* @param event The HTTPEvent passed by the handler.
* @param validate The function to use for body validation. It will be called passing the read request body. If the result is not false, the parsed body will be returned.
* @throws If the validation function returns `false` or throws, a validation error will be thrown.
* @return {*} The `Object`, `Array`, `String`, `Number`, `Boolean`, or `null` value corresponding to the request JSON body.
* @see {readBody}
*/
async function readValidatedBody(event, validate) {
	const _body = await readBody(event);
	return validateData(_body, validate);
}

//#endregion
//#region src/utils/cookie.ts
const CHUNKED_COOKIE = "__chunked__";
const CHUNKS_MAX_LENGTH = 4e3;
/**
* Parse the request to get HTTP Cookie header string and returning an object of all cookie name-value pairs.
* @param event {HTTPEvent} H3 event or req passed by h3 handler
* @returns Object of cookie name-value pairs
* ```ts
* const cookies = parseCookies(event)
* ```
*/
function parseCookies(event) {
	return parse(event.req.headers.get("cookie") || "");
}
/**
* Get a cookie value by name.
* @param event {HTTPEvent} H3 event or req passed by h3 handler
* @param name Name of the cookie to get
* @returns {*} Value of the cookie (String or undefined)
* ```ts
* const authorization = getCookie(request, 'Authorization')
* ```
*/
function getCookie(event, name) {
	return parseCookies(event)[name];
}
/**
* Set a cookie value by name.
* @param event {H3Event} H3 event or res passed by h3 handler
* @param name Name of the cookie to set
* @param value Value of the cookie to set
* @param options {CookieSerializeOptions} Options for serializing the cookie
* ```ts
* setCookie(res, 'Authorization', '1234567')
* ```
*/
function setCookie(event, name, value, options) {
	const newCookie = serialize(name, value, {
		path: "/",
		...options
	});
	const currentCookies = event.res.headers.getSetCookie();
	if (currentCookies.length === 0) {
		event.res.headers.set("set-cookie", newCookie);
		return;
	}
	const newCookieKey = _getDistinctCookieKey(name, options || {});
	event.res.headers.delete("set-cookie");
	for (const cookie of currentCookies) {
		const _key = _getDistinctCookieKey(cookie.split("=")?.[0], parseSetCookie(cookie));
		if (_key === newCookieKey) continue;
		event.res.headers.append("set-cookie", cookie);
	}
	event.res.headers.append("set-cookie", newCookie);
}
/**
* Remove a cookie by name.
* @param event {H3Event} H3 event or res passed by h3 handler
* @param name Name of the cookie to delete
* @param serializeOptions {CookieSerializeOptions} Cookie options
* ```ts
* deleteCookie(res, 'SessionId')
* ```
*/
function deleteCookie(event, name, serializeOptions) {
	setCookie(event, name, "", {
		...serializeOptions,
		maxAge: 0
	});
}
/**
* Get a chunked cookie value by name. Will join chunks together.
* @param event {HTTPEvent} { req: Request }
* @param name Name of the cookie to get
* @returns {*} Value of the cookie (String or undefined)
* ```ts
* const authorization = getCookie(request, 'Session')
* ```
*/
function getChunkedCookie(event, name) {
	const mainCookie = getCookie(event, name);
	if (!mainCookie || !mainCookie.startsWith(CHUNKED_COOKIE)) return mainCookie;
	const chunksCount = getChunkedCookieCount(mainCookie);
	if (chunksCount === 0) return void 0;
	const chunks = [];
	for (let i = 1; i <= chunksCount; i++) {
		const chunk = getCookie(event, chunkCookieName(name, i));
		if (!chunk) return void 0;
		chunks.push(chunk);
	}
	return chunks.join("");
}
/**
* Set a cookie value by name. Chunked cookies will be created as needed.
* @param event {H3Event} H3 event or res passed by h3 handler
* @param name Name of the cookie to set
* @param value Value of the cookie to set
* @param options {CookieSerializeOptions} Options for serializing the cookie
* ```ts
* setCookie(res, 'Session', '<session data>')
* ```
*/
function setChunkedCookie(event, name, value, options) {
	const chunkMaxLength = options?.chunkMaxLength || CHUNKS_MAX_LENGTH;
	const chunkCount = Math.ceil(value.length / chunkMaxLength);
	const previousCookie = getCookie(event, name);
	if (previousCookie?.startsWith(CHUNKED_COOKIE)) {
		const previousChunkCount = getChunkedCookieCount(previousCookie);
		if (previousChunkCount > chunkCount) for (let i = chunkCount; i <= previousChunkCount; i++) deleteCookie(event, chunkCookieName(name, i), options);
	}
	if (chunkCount <= 1) {
		setCookie(event, name, value, options);
		return;
	}
	const mainCookieValue = `${CHUNKED_COOKIE}${chunkCount}`;
	setCookie(event, name, mainCookieValue, options);
	for (let i = 1; i <= chunkCount; i++) {
		const start = (i - 1) * chunkMaxLength;
		const end = start + chunkMaxLength;
		const chunkValue = value.slice(start, end);
		setCookie(event, chunkCookieName(name, i), chunkValue, options);
	}
}
/**
* Cookies are unique by "cookie-name, domain-value, and path-value".
*
* @see https://httpwg.org/specs/rfc6265.html#rfc.section.4.1.2
*/
function _getDistinctCookieKey(name, options) {
	return [
		name,
		options.domain || "",
		options.path || "/"
	].join(";");
}
function getChunkedCookieCount(cookie) {
	if (!cookie?.startsWith(CHUNKED_COOKIE)) return Number.NaN;
	return Number.parseInt(cookie.slice(CHUNKED_COOKIE.length));
}
function chunkCookieName(name, chunkNumber) {
	return `${name}.${chunkNumber}`;
}

//#endregion
//#region src/utils/internal/event-stream.ts
/**
* A helper class for [server sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format)
*/
var EventStream = class {
	_event;
	_transformStream = new TransformStream();
	_writer;
	_encoder = new TextEncoder();
	_writerIsClosed = false;
	_paused = false;
	_unsentData;
	_disposed = false;
	_handled = false;
	constructor(event, opts = {}) {
		this._event = event;
		this._writer = this._transformStream.writable.getWriter();
		this._writer.closed.then(() => {
			this._writerIsClosed = true;
		});
		if (opts.autoclose !== false) this._event.runtime?.node?.res?.once("close", () => this.close());
	}
	async push(message) {
		if (typeof message === "string") {
			await this._sendEvent({ data: message });
			return;
		}
		if (Array.isArray(message)) {
			if (message.length === 0) return;
			if (typeof message[0] === "string") {
				const msgs = [];
				for (const item of message) msgs.push({ data: item });
				await this._sendEvents(msgs);
				return;
			}
			await this._sendEvents(message);
			return;
		}
		await this._sendEvent(message);
	}
	async pushComment(comment) {
		if (this._writerIsClosed) return;
		if (this._paused && !this._unsentData) {
			this._unsentData = formatEventStreamComment(comment);
			return;
		}
		if (this._paused) {
			this._unsentData += formatEventStreamComment(comment);
			return;
		}
		await this._writer.write(this._encoder.encode(formatEventStreamComment(comment))).catch();
	}
	async _sendEvent(message) {
		if (this._writerIsClosed) return;
		if (this._paused && !this._unsentData) {
			this._unsentData = formatEventStreamMessage(message);
			return;
		}
		if (this._paused) {
			this._unsentData += formatEventStreamMessage(message);
			return;
		}
		await this._writer.write(this._encoder.encode(formatEventStreamMessage(message))).catch();
	}
	async _sendEvents(messages) {
		if (this._writerIsClosed) return;
		const payload = formatEventStreamMessages(messages);
		if (this._paused && !this._unsentData) {
			this._unsentData = payload;
			return;
		}
		if (this._paused) {
			this._unsentData += payload;
			return;
		}
		await this._writer.write(this._encoder.encode(payload)).catch();
	}
	pause() {
		this._paused = true;
	}
	get isPaused() {
		return this._paused;
	}
	async resume() {
		this._paused = false;
		await this.flush();
	}
	async flush() {
		if (this._writerIsClosed) return;
		if (this._unsentData?.length) {
			await this._writer.write(this._encoder.encode(this._unsentData));
			this._unsentData = void 0;
		}
	}
	/**
	* Close the stream and the connection if the stream is being sent to the client
	*/
	async close() {
		if (this._disposed) return;
		if (!this._writerIsClosed) try {
			await this._writer.close();
		} catch {}
		this._disposed = true;
	}
	/**
	* Triggers callback when the writable stream is closed.
	* It is also triggered after calling the `close()` method.
	*/
	onClosed(cb) {
		this._writer.closed.then(cb);
	}
	async send() {
		setEventStreamHeaders(this._event);
		this._event.res.status = 200;
		this._handled = true;
		return this._transformStream.readable;
	}
};
function formatEventStreamComment(comment) {
	return `: ${comment}\n\n`;
}
function formatEventStreamMessage(message) {
	let result = "";
	if (message.id) result += `id: ${message.id}\n`;
	if (message.event) result += `event: ${message.event}\n`;
	if (typeof message.retry === "number" && Number.isInteger(message.retry)) result += `retry: ${message.retry}\n`;
	result += `data: ${message.data}\n\n`;
	return result;
}
function formatEventStreamMessages(messages) {
	let result = "";
	for (const msg of messages) result += formatEventStreamMessage(msg);
	return result;
}
function setEventStreamHeaders(event) {
	event.res.headers.set("content-type", "text/event-stream");
	event.res.headers.set("cache-control", "private, no-cache, no-store, no-transform, must-revalidate, max-age=0");
	event.res.headers.set("x-accel-buffering", "no");
	if (event.req.headers.get("connection") === "keep-alive") event.res.headers.set("connection", "keep-alive");
}

//#endregion
//#region src/utils/event-stream.ts
/**
* Initialize an EventStream instance for creating [server sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
*
* @experimental This function is experimental and might be unstable in some environments.
*
* @example
*
* ```ts
* import { createEventStream, sendEventStream } from "h3";
*
* app.get("/sse", (event) => {
*   const eventStream = createEventStream(event);
*
*   // Send a message every second
*   const interval = setInterval(async () => {
*     await eventStream.push("Hello world");
*   }, 1000);
*
*   // cleanup the interval and close the stream when the connection is terminated
*   eventStream.onClosed(async () => {
*     console.log("closing SSE...");
*     clearInterval(interval);
*     await eventStream.close();
*   });
*
*   return eventStream.send();
* });
* ```
*/
function createEventStream(event, opts) {
	return new EventStream(event, opts);
}

//#endregion
//#region src/utils/cache.ts
/**
* Check request caching headers (`If-Modified-Since`) and add caching headers (Last-Modified, Cache-Control)
* Note: `public` cache control will be added by default
* @returns `true` when cache headers are matching. When `true` is returned, no response should be sent anymore
*/
function handleCacheHeaders(event, opts) {
	const cacheControls = ["public", ...opts.cacheControls || []];
	let cacheMatched = false;
	if (opts.maxAge !== void 0) cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
	if (opts.modifiedTime) {
		const modifiedTime = new Date(opts.modifiedTime);
		const ifModifiedSince = event.req.headers.get("if-modified-since");
		event.res.headers.set("last-modified", modifiedTime.toUTCString());
		if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) cacheMatched = true;
	}
	if (opts.etag) {
		event.res.headers.set("etag", opts.etag);
		const ifNonMatch = event.req.headers.get("if-none-match");
		if (ifNonMatch === opts.etag) cacheMatched = true;
	}
	event.res.headers.set("cache-control", cacheControls.join(", "));
	if (cacheMatched) {
		event.res.status = 304;
		return true;
	}
	return false;
}

//#endregion
//#region src/utils/internal/path.ts
function withLeadingSlash(path) {
	if (!path || path === "/") return "/";
	return path[0] === "/" ? path : `/${path}`;
}
function withoutTrailingSlash(path) {
	if (!path || path === "/") return "/";
	return path[path.length - 1] === "/" ? path.slice(0, -1) : path;
}
function withoutBase(input = "", base = "") {
	if (!base || base === "/") return input;
	const _base = withoutTrailingSlash(base);
	if (!input.startsWith(_base)) return input;
	const trimmed = input.slice(_base.length);
	return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}

//#endregion
//#region src/utils/internal/mime.ts
const COMMON_MIME_TYPES = {
	".html": "text/html",
	".htm": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".json": "application/json",
	".txt": "text/plain",
	".xml": "application/xml",
	".gif": "image/gif",
	".ico": "image/vnd.microsoft.icon",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".mp4": "video/mp4",
	".webm": "video/webm",
	".zip": "application/zip",
	".pdf": "application/pdf"
};
function getExtension(path) {
	const filename = path.split("/").pop();
	if (!filename) return;
	const separatorIndex = filename.lastIndexOf(".");
	if (separatorIndex !== -1) return filename.slice(separatorIndex);
}
function getType(ext) {
	return ext ? COMMON_MIME_TYPES[ext] : void 0;
}

//#endregion
//#region src/utils/static.ts
/**
* Dynamically serve static assets based on the request path.
*/
async function serveStatic(event, options) {
	if (options.headers) {
		const entries = Array.isArray(options.headers) ? options.headers : typeof options.headers.entries === "function" ? options.headers.entries() : Object.entries(options.headers);
		for (const [key, value] of entries) event.res.headers.set(key, value);
	}
	if (event.req.method !== "GET" && event.req.method !== "HEAD") {
		if (options.fallthrough) return;
		event.res.headers.set("allow", "GET, HEAD");
		throw new HTTPError({ status: 405 });
	}
	const originalId = decodeURI(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	const acceptEncodings = parseAcceptEncoding(event.req.headers.get("accept-encoding") || "", options.encodings);
	if (acceptEncodings.length > 1) event.res.headers.set("vary", "accept-encoding");
	let id = originalId;
	let meta;
	const _ids = idSearchPaths(originalId, acceptEncodings, options.indexNames || ["/index.html"]);
	for (const _id of _ids) {
		const _meta = await options.getMeta(_id);
		if (_meta) {
			meta = _meta;
			id = _id;
			break;
		}
	}
	if (!meta) {
		if (options.fallthrough) return;
		throw new HTTPError({ statusCode: 404 });
	}
	if (meta.mtime) {
		const mtimeDate = new Date(meta.mtime);
		const ifModifiedSinceH = event.req.headers.get("if-modified-since");
		if (ifModifiedSinceH && new Date(ifModifiedSinceH) >= mtimeDate) {
			event.res.status = 304;
			event.res.statusText = "Not Modified";
			return "";
		}
		if (!event.res.headers.get("last-modified")) event.res.headers.set("last-modified", mtimeDate.toUTCString());
	}
	if (meta.etag && !event.res.headers.has("etag")) event.res.headers.set("etag", meta.etag);
	const ifNotMatch = meta.etag && event.req.headers.get("if-none-match") === meta.etag;
	if (ifNotMatch) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (!event.res.headers.get("content-type")) if (meta.type) event.res.headers.set("content-type", meta.type);
	else {
		const ext = getExtension(id);
		const type = ext ? options.getType?.(ext) ?? getType(ext) : void 0;
		if (type) event.res.headers.set("content-type", type);
	}
	if (meta.encoding && !event.res.headers.get("content-encoding")) event.res.headers.set("content-encoding", meta.encoding);
	if (meta.size !== void 0 && meta.size > 0 && !event.req.headers.get("content-length")) event.res.headers.set("content-length", meta.size + "");
	if (event.req.method === "HEAD") return "";
	const contents = await options.getContents(id);
	return contents;
}
function parseAcceptEncoding(header, encodingMap) {
	if (!encodingMap || !header) return [];
	return String(header || "").split(",").map((e) => encodingMap[e.trim()]).filter(Boolean);
}
function idSearchPaths(id, encodings, indexNames) {
	const ids = [];
	for (const suffix of ["", ...indexNames]) for (const encoding of [...encodings, ""]) ids.push(`${id}${suffix}${encoding}`);
	return ids;
}

//#endregion
//#region src/utils/base.ts
/**
* Returns a new event handler that removes the base url of the event before calling the original handler.
*
* @example
* const api = new H3()
*  .get("/", () => "Hello API!");
* const app = new H3();
*  .use("/api/**", withBase("/api", api.handler));
*
* @param base The base path to prefix.
* @param handler The event handler to use with the adapted path.
*/
function withBase(base, input) {
	base = withoutTrailingSlash(base);
	const _originalHandler = input?.handler || input;
	const _handler = async (event) => {
		const _pathBefore = event.url.pathname || "/";
		event.url.pathname = withoutBase(event.url.pathname || "/", base);
		return Promise.resolve(_originalHandler(event)).finally(() => {
			event.url.pathname = _pathBefore;
		});
	};
	return _handler;
}

//#endregion
//#region src/utils/internal/iron-crypto.ts
/** The default encryption and integrity settings. */
const defaults = /* @__PURE__ */ Object.freeze({
	ttl: 0,
	timestampSkewSec: 60,
	localtimeOffsetMsec: 0,
	encryption: /* @__PURE__ */ Object.freeze({
		saltBits: 256,
		algorithm: "aes-256-cbc",
		iterations: 1,
		minPasswordlength: 32
	}),
	integrity: /* @__PURE__ */ Object.freeze({
		saltBits: 256,
		algorithm: "sha256",
		iterations: 1,
		minPasswordlength: 32
	})
});
/** Configuration of each supported algorithm. */
const algorithms = /* @__PURE__ */ Object.freeze({
	"aes-128-ctr": /* @__PURE__ */ Object.freeze({
		keyBits: 128,
		ivBits: 128,
		name: "AES-CTR"
	}),
	"aes-256-cbc": /* @__PURE__ */ Object.freeze({
		keyBits: 256,
		ivBits: 128,
		name: "AES-CBC"
	}),
	sha256: /* @__PURE__ */ Object.freeze({
		keyBits: 256,
		ivBits: 128,
		name: "SHA-256"
	})
});
/** MAC normalization prefix. */
const macPrefix = "Fe26.2";
/** Serializes, encrypts, and signs objects into an iron protocol string. */
async function seal(object, password, opts) {
	const now = Date.now() + (opts.localtimeOffsetMsec || 0);
	if (!password) throw new Error("Empty password");
	const { id = "", encryption, integrity } = normalizePassword(password);
	if (id && !/^\w+$/.test(id)) throw new Error("Invalid password id");
	const { encrypted, key } = await encrypt(encryption, opts.encryption, JSON.stringify(object));
	const encryptedB64 = base64Encode(encrypted);
	const iv = base64Encode(key.iv);
	const expiration = opts.ttl ? now + opts.ttl : "";
	const macBaseString = `${macPrefix}*${id}*${key.salt}*${iv}*${encryptedB64}*${expiration}`;
	const mac = await hmacWithPassword(integrity, opts.integrity, macBaseString);
	const sealed = `${macBaseString}*${mac.salt}*${mac.digest}`;
	return sealed;
}
/** Verifies, decrypts, and reconstruct an iron protocol string into an object. */
async function unseal(sealed, password, opts) {
	const now = Date.now() + (opts.localtimeOffsetMsec || 0);
	if (!password) throw new Error("Empty password");
	const parts = sealed.split("*");
	if (parts.length !== 8) throw new Error("Incorrect number of sealed components");
	const [prefix, passwordId, encryptionSalt, encryptionIv, encryptedB64, expiration, hmacSalt, hmac] = parts;
	const macBaseString = `${prefix}*${passwordId}*${encryptionSalt}*${encryptionIv}*${encryptedB64}*${expiration}`;
	if (macPrefix !== prefix) throw new Error("Wrong mac prefix");
	if (expiration) {
		if (!/^\d+$/.test(expiration)) throw new Error("Invalid expiration");
		const exp = Number.parseInt(expiration, 10);
		if (exp <= now - opts.timestampSkewSec * 1e3) throw new Error("Expired seal");
	}
	let pass = "";
	const _passwordId = passwordId || "default";
	if (typeof password === "string" || password instanceof Uint8Array) pass = password;
	else if (_passwordId in password) pass = password[_passwordId];
	else throw new Error(`Cannot find password: ${_passwordId}`);
	pass = normalizePassword(pass);
	const mac = await hmacWithPassword(pass.integrity, {
		...opts.integrity,
		salt: hmacSalt
	}, macBaseString);
	if (!fixedTimeComparison(mac.digest, hmac)) throw new Error("Bad hmac value");
	const encrypted = base64Decode(encryptedB64);
	const decryptOptions = {
		...opts.encryption,
		salt: encryptionSalt,
		iv: base64Decode(encryptionIv)
	};
	const decrypted = await decrypt(pass.encryption, decryptOptions, encrypted);
	return decrypted ? JSON.parse(decrypted) : null;
}
/** Calculates a HMAC digest. */
async function hmacWithPassword(password, options, data) {
	const key = await generateKey(password, {
		...options,
		hmac: true
	});
	const textBuffer = textEncoder.encode(data);
	const signed = await crypto.subtle.sign({ name: "HMAC" }, key.key, textBuffer);
	const digest = base64Encode(new Uint8Array(signed));
	return {
		digest,
		salt: key.salt
	};
}
/** Generates a key from the password. */
async function generateKey(password, options) {
	if (!password?.length) throw new Error("Empty password");
	if (options == null || typeof options !== "object") throw new Error("Bad options");
	if (!(options.algorithm in algorithms)) throw new Error(`Unknown algorithm: ${options.algorithm}`);
	const algorithm = algorithms[options.algorithm];
	let resultKey;
	let resultSalt;
	let resultIV;
	const hmac = options.hmac ?? false;
	const id = hmac ? {
		name: "HMAC",
		hash: algorithm.name
	} : { name: algorithm.name };
	const usage = hmac ? ["sign", "verify"] : ["encrypt", "decrypt"];
	if (typeof password === "string") {
		if (password.length < options.minPasswordlength) throw new Error(`Password string too short (min ${options.minPasswordlength} characters required)`);
		let { salt = "" } = options;
		if (!salt) {
			const { saltBits = 0 } = options;
			if (!saltBits) throw new Error("Missing salt and saltBits options");
			const randomSalt = randomBits(saltBits);
			salt = [...new Uint8Array(randomSalt)].map((x) => x.toString(16).padStart(2, "0")).join("");
		}
		const derivedKey = await pbkdf2(password, salt, options.iterations, algorithm.keyBits / 8, "SHA-1");
		const importedEncryptionKey = await crypto.subtle.importKey("raw", derivedKey, id, false, usage);
		resultKey = importedEncryptionKey;
		resultSalt = salt;
	} else {
		if (password.length < algorithm.keyBits / 8) throw new Error("Key buffer (password) too small");
		resultKey = await crypto.subtle.importKey("raw", password, id, false, usage);
		resultSalt = "";
	}
	if (options.iv) resultIV = options.iv;
	else if ("ivBits" in algorithm) resultIV = randomBits(algorithm.ivBits);
	else throw new Error("Missing IV");
	return {
		key: resultKey,
		salt: resultSalt,
		iv: resultIV
	};
}
/** Provides an asynchronous Password-Based Key Derivation Function 2 (PBKDF2) implementation. */
async function pbkdf2(password, salt, iterations, keyLength, hash) {
	const passwordBuffer = textEncoder.encode(password);
	const importedKey = await crypto.subtle.importKey("raw", passwordBuffer, { name: "PBKDF2" }, false, ["deriveBits"]);
	const saltBuffer = textEncoder.encode(salt);
	const params = {
		name: "PBKDF2",
		hash,
		salt: saltBuffer,
		iterations
	};
	const derivation = await crypto.subtle.deriveBits(params, importedKey, keyLength * 8);
	return derivation;
}
async function encrypt(password, options, data) {
	const key = await generateKey(password, options);
	const encrypted = await crypto.subtle.encrypt(...getEncryptParams(options.algorithm, key, data));
	return {
		encrypted: new Uint8Array(encrypted),
		key
	};
}
async function decrypt(password, options, data) {
	const key = await generateKey(password, options);
	const decrypted = await crypto.subtle.decrypt(...getEncryptParams(options.algorithm, key, data));
	return textDecoder.decode(decrypted);
}
function getEncryptParams(algorithm, key, data) {
	return [
		algorithm === "aes-128-ctr" ? {
			name: "AES-CTR",
			counter: key.iv,
			length: 128
		} : {
			name: "AES-CBC",
			iv: key.iv
		},
		key.key,
		typeof data === "string" ? textEncoder.encode(data) : data
	];
}
/** Returns true if `a` is equal to `b`, without leaking timing information that would allow an attacker to guess one of the values. */
function fixedTimeComparison(a, b) {
	let mismatch = a.length === b.length ? 0 : 1;
	if (mismatch) b = a;
	for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return mismatch === 0;
}
/** Normalizes a password parameter. */
function normalizePassword(password) {
	if (typeof password === "string" || password instanceof Uint8Array) return {
		encryption: password,
		integrity: password
	};
	if ("secret" in password) return {
		id: password.id,
		encryption: password.secret,
		integrity: password.secret
	};
	return {
		id: password.id,
		encryption: password.encryption,
		integrity: password.integrity
	};
}
/** Generate cryptographically strong pseudorandom bits. */
function randomBits(bits) {
	if (bits < 1) throw new Error("Invalid random bits count");
	const bytes = Math.ceil(bits / 8);
	return randomBytes(bytes);
}
/** Generates cryptographically strong pseudorandom bytes. */
function randomBytes(size) {
	const bytes = new Uint8Array(size);
	crypto.getRandomValues(bytes);
	return bytes;
}

//#endregion
//#region src/utils/internal/session.ts
const kGetSession = /* @__PURE__ */ Symbol.for("h3.internal.session.promise");
const DEFAULT_SESSION_NAME = "h3";
const DEFAULT_SESSION_COOKIE = {
	path: "/",
	secure: true,
	httpOnly: true
};

//#endregion
//#region src/utils/session.ts
/**
* Create a session manager for the current request.
*
*/
async function useSession(event, config) {
	const sessionName = config.name || DEFAULT_SESSION_NAME;
	await getSession(event, config);
	const sessionManager = {
		get id() {
			const context = getEventContext(event);
			return context?.sessions?.[sessionName]?.id;
		},
		get data() {
			const context = getEventContext(event);
			return context.sessions?.[sessionName]?.data || {};
		},
		update: async (update) => {
			await updateSession(event, config, update);
			return sessionManager;
		},
		clear: () => {
			clearSession(event, config);
			return Promise.resolve(sessionManager);
		}
	};
	return sessionManager;
}
/**
* Get the session for the current request.
*/
async function getSession(event, config) {
	const sessionName = config.name || DEFAULT_SESSION_NAME;
	const context = getEventContext(event);
	if (!context.sessions) context.sessions = new EmptyObject();
	const existingSession = context.sessions[sessionName];
	if (existingSession) return existingSession[kGetSession] || existingSession;
	const session = {
		id: "",
		createdAt: 0,
		data: new EmptyObject()
	};
	context.sessions[sessionName] = session;
	let sealedSession;
	if (config.sessionHeader !== false) {
		const headerName = typeof config.sessionHeader === "string" ? config.sessionHeader.toLowerCase() : `x-${sessionName.toLowerCase()}-session`;
		const headerValue = event.req.headers.get(headerName);
		if (typeof headerValue === "string") sealedSession = headerValue;
	}
	if (!sealedSession) sealedSession = getChunkedCookie(event, sessionName);
	if (sealedSession) {
		const promise = unsealSession(event, config, sealedSession).catch(() => {}).then((unsealed) => {
			Object.assign(session, unsealed);
			delete context.sessions[sessionName][kGetSession];
			return session;
		});
		context.sessions[sessionName][kGetSession] = promise;
		await promise;
	}
	if (!session.id) {
		session.id = config.generateId?.() ?? (config.crypto || crypto).randomUUID();
		session.createdAt = Date.now();
		await updateSession(event, config);
	}
	return session;
}
/**
* Update the session data for the current request.
*/
async function updateSession(event, config, update) {
	const sessionName = config.name || DEFAULT_SESSION_NAME;
	const context = getEventContext(event);
	const session = context.sessions?.[sessionName] || await getSession(event, config);
	if (typeof update === "function") update = update(session.data);
	if (update) Object.assign(session.data, update);
	if (config.cookie !== false && event.res) {
		const sealed = await sealSession(event, config);
		setChunkedCookie(event, sessionName, sealed, {
			...DEFAULT_SESSION_COOKIE,
			expires: config.maxAge ? new Date(session.createdAt + config.maxAge * 1e3) : void 0,
			...config.cookie
		});
	}
	return session;
}
/**
* Encrypt and sign the session data for the current request.
*/
async function sealSession(event, config) {
	const sessionName = config.name || DEFAULT_SESSION_NAME;
	const context = getEventContext(event);
	const session = context.sessions?.[sessionName] || await getSession(event, config);
	const sealed = await seal(session, config.password, {
		...defaults,
		ttl: config.maxAge ? config.maxAge * 1e3 : 0,
		...config.seal
	});
	return sealed;
}
/**
* Decrypt and verify the session data for the current request.
*/
async function unsealSession(_event, config, sealed) {
	const unsealed = await unseal(sealed, config.password, {
		...defaults,
		ttl: config.maxAge ? config.maxAge * 1e3 : 0,
		...config.seal
	});
	if (config.maxAge) {
		const age = Date.now() - (unsealed.createdAt || Number.NEGATIVE_INFINITY);
		if (age > config.maxAge * 1e3) throw new Error("Session expired!");
	}
	return unsealed;
}
/**
* Clear the session data for the current request.
*/
function clearSession(event, config) {
	const context = getEventContext(event);
	const sessionName = config.name || DEFAULT_SESSION_NAME;
	if (context.sessions?.[sessionName]) delete context.sessions[sessionName];
	if (event.res && config.cookie !== false) setChunkedCookie(event, sessionName, "", {
		...DEFAULT_SESSION_COOKIE,
		...config.cookie
	});
	return Promise.resolve();
}

//#endregion
//#region src/utils/internal/cors.ts
/**
* Resolve CORS options.
*/
function resolveCorsOptions(options = {}) {
	const defaultOptions = {
		origin: "*",
		methods: "*",
		allowHeaders: "*",
		exposeHeaders: "*",
		credentials: false,
		maxAge: false,
		preflight: { statusCode: 204 }
	};
	return {
		...defaultOptions,
		...options,
		preflight: {
			...defaultOptions.preflight,
			...options.preflight
		}
	};
}
/**
* Check if the origin is allowed.
*/
function isCorsOriginAllowed(origin, options) {
	const { origin: originOption } = options;
	if (!origin) return false;
	if (!originOption || originOption === "*") return true;
	if (typeof originOption === "function") return originOption(origin);
	if (Array.isArray(originOption)) return originOption.some((_origin) => {
		if (_origin instanceof RegExp) return _origin.test(origin);
		return origin === _origin;
	});
	return originOption === origin;
}
/**
* Create the `access-control-allow-origin` header.
*/
function createOriginHeaders(event, options) {
	const { origin: originOption } = options;
	const origin = event.req.headers.get("origin");
	if (!originOption || originOption === "*") return { "access-control-allow-origin": "*" };
	if (originOption === "null") return {
		"access-control-allow-origin": "null",
		vary: "origin"
	};
	if (isCorsOriginAllowed(origin, options)) return {
		"access-control-allow-origin": origin,
		vary: "origin"
	};
	return {};
}
/**
* Create the `access-control-allow-methods` header.
*/
function createMethodsHeaders(options) {
	const { methods } = options;
	if (!methods) return {};
	if (methods === "*") return { "access-control-allow-methods": "*" };
	return methods.length > 0 ? { "access-control-allow-methods": methods.join(",") } : {};
}
/**
* Create the `access-control-allow-credentials` header.
*/
function createCredentialsHeaders(options) {
	const { credentials } = options;
	if (credentials) return { "access-control-allow-credentials": "true" };
	return {};
}
/**
* Create the `access-control-allow-headers` and `vary` headers.
*/
function createAllowHeaderHeaders(event, options) {
	const { allowHeaders } = options;
	if (!allowHeaders || allowHeaders === "*" || allowHeaders.length === 0) {
		const header = event.req.headers.get("access-control-request-headers");
		return header ? {
			"access-control-allow-headers": header,
			vary: "access-control-request-headers"
		} : {};
	}
	return {
		"access-control-allow-headers": allowHeaders.join(","),
		vary: "access-control-request-headers"
	};
}
/**
* Create the `access-control-expose-headers` header.
*/
function createExposeHeaders(options) {
	const { exposeHeaders } = options;
	if (!exposeHeaders) return {};
	if (exposeHeaders === "*") return { "access-control-expose-headers": exposeHeaders };
	return { "access-control-expose-headers": exposeHeaders.join(",") };
}
/**
* Create the `access-control-max-age` header.
*/
function createMaxAgeHeader(options) {
	const { maxAge } = options;
	if (maxAge) return { "access-control-max-age": maxAge };
	return {};
}

//#endregion
//#region src/utils/cors.ts
/**
* Check if the incoming request is a CORS preflight request.
*/
function isPreflightRequest(event) {
	const origin = event.req.headers.get("origin");
	const accessControlRequestMethod = event.req.headers.get("access-control-request-method");
	return event.req.method === "OPTIONS" && !!origin && !!accessControlRequestMethod;
}
/**
* Append CORS preflight headers to the response.
*/
function appendCorsPreflightHeaders(event, options) {
	const headers = {
		...createOriginHeaders(event, options),
		...createCredentialsHeaders(options),
		...createMethodsHeaders(options),
		...createAllowHeaderHeaders(event, options),
		...createMaxAgeHeader(options)
	};
	for (const [key, value] of Object.entries(headers)) event.res.headers.append(key, value);
}
/**
* Append CORS headers to the response.
*/
function appendCorsHeaders(event, options) {
	const headers = {
		...createOriginHeaders(event, options),
		...createCredentialsHeaders(options),
		...createExposeHeaders(options)
	};
	for (const [key, value] of Object.entries(headers)) event.res.headers.append(key, value);
}
/**
* Handle CORS for the incoming request.
*
* If the incoming request is a CORS preflight request, it will append the CORS preflight headers and send a 204 response.
*
* If return value is `true`, the request is handled and no further action is needed.
*
* @example
* const app = new H3();
* const router = createRouter();
* router.use("/", async (event) => {
*   const corsRes = handleCors(event, {
*     origin: "*",
*     preflight: {
*       statusCode: 204,
*     },
*     methods: "*",
*   });
*   if (corsRes) {
*     return corsRes;
*   }
*   // Your code here
* });
*/
function handleCors(event, options) {
	const _options = resolveCorsOptions(options);
	if (isPreflightRequest(event)) {
		appendCorsPreflightHeaders(event, options);
		return noContent(event, _options.preflight.statusCode);
	}
	appendCorsHeaders(event, options);
	return false;
}

//#endregion
//#region src/utils/auth.ts
/**
* Apply basic authentication for current request.
*
* @example
* import { defineHandler, requireBasicAuth } from "h3";
* export default defineHandler(async (event) => {
*   await requireBasicAuth(event, { password: "test" });
*   return `Hello, ${event.context.basicAuth.username}!`;
* });
*/
async function requireBasicAuth(event, opts) {
	if (!opts.validate && !opts.password) throw new Error("You must provide either a validate function or a password for basic auth.");
	const authHeader = event.req.headers.get("authorization");
	if (!authHeader) throw autheFailed(event);
	const [authType, b64auth] = authHeader.split(" ");
	if (authType !== "Basic" || !b64auth) throw autheFailed(event, opts?.realm);
	const [username, password] = atob(b64auth).split(":");
	if (!username || !password) throw autheFailed(event, opts?.realm);
	if (opts.username && username !== opts.username) throw autheFailed(event, opts?.realm);
	if (opts.password && password !== opts.password) throw autheFailed(event, opts?.realm);
	if (opts.validate && !await opts.validate(username, password)) throw autheFailed(event, opts?.realm);
	const context = getEventContext(event);
	context.basicAuth = {
		username,
		password,
		realm: opts.realm
	};
	return true;
}
/**
* Create a basic authentication middleware.
*
* @example
* import { H3, serve, basicAuth } from "h3";
* const auth = basicAuth({ password: "test" });
* app.get("/", (event) => `Hello ${event.context.basicAuth?.username}!`, [auth]);
* serve(app, { port: 3000 });
*/
function basicAuth(opts) {
	return async (event, next) => {
		await requireBasicAuth(event, opts);
		return next();
	};
}
function autheFailed(event, realm = "") {
	return new HTTPError({
		status: 401,
		statusText: "Authentication required",
		headers: { "www-authenticate": `Basic realm=${JSON.stringify(realm)}` }
	});
}

//#endregion
//#region src/utils/fingerprint.ts
/**
*
* Get a unique fingerprint for the incoming request.
*
* @experimental Behavior of this utility might change in the future versions
*/
async function getRequestFingerprint(event, opts = {}) {
	const fingerprint = [];
	if (opts.ip !== false) fingerprint.push(getRequestIP(event, { xForwardedFor: opts.xForwardedFor }));
	if (opts.method === true) fingerprint.push(event.req.method);
	if (opts.url === true) fingerprint.push(event.req.url);
	if (opts.userAgent === true) fingerprint.push(event.req.headers.get("user-agent"));
	const fingerprintString = fingerprint.filter(Boolean).join("|");
	if (!fingerprintString) return null;
	if (opts.hash === false) return fingerprintString;
	const buffer = await crypto.subtle.digest(opts.hash || "SHA-1", new TextEncoder().encode(fingerprintString));
	const hash = [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
	return hash;
}

//#endregion
//#region src/utils/ws.ts
/**
* Define WebSocket hooks.
*
* @see https://h3.dev/guide/websocket
*/
function defineWebSocket(hooks) {
	return hooks;
}
/**
* Define WebSocket event handler.
*
* @see https://h3.dev/guide/websocket
*/
function defineWebSocketHandler(hooks) {
	return defineHandler(() => {
		return Object.assign(new Response("WebSocket upgrade is required.", { status: 426 }), { crossws: hooks });
	});
}

//#endregion
//#region src/_deprecated.ts
/** @deprecated Use `HTTPError` */
const H3Error = HTTPError;
function createError(arg1, arg2) {
	return new HTTPError(arg1, arg2);
}
/**
* @deprecated Use `HTTPError.isError`
*/
function isError(input) {
	return HTTPError.isError(input);
}
/** @deprecated Please use `event.url` */
const getRequestPath = (event) => event.path;
/** @deprecated Please use `event.req.headers.get(name)` */
function getRequestHeader(event, name) {
	return event.req.headers.get(name) || void 0;
}
/** @deprecated Please use `event.req.headers.get(name)` */
const getHeader = getRequestHeader;
/** @deprecated Please use `Object.fromEntries(event.req.headers.entries())` */
function getRequestHeaders(event) {
	return Object.fromEntries(event.req.headers.entries());
}
/** @deprecated Please use `Object.fromEntries(event.req.headers.entries())` */
const getHeaders = getRequestHeaders;
/** @deprecated Please use `event.req.method` */
function getMethod(event, defaultMethod = "GET") {
	return (event.req.method || defaultMethod).toUpperCase();
}
/** @deprecated Please use `event.req.text()` or `event.req.arrayBuffer()` */
function readRawBody(event, encoding = "utf8") {
	return encoding ? event.req.text() : event.req.arrayBuffer().then((r) => new Uint8Array(r));
}
/** @deprecated Please use `event.req.formData()` */
async function readFormDataBody(event) {
	return event.req.formData();
}
/** @deprecated Please use `event.req.formData()` */
const readFormData = readFormDataBody;
/** @deprecated Please use `event.req.formData()` */
async function readMultipartFormData(event) {
	const formData = await event.req.formData();
	return Promise.all([...formData.entries()].map(async ([key, value]) => {
		return value instanceof Blob ? {
			name: key,
			type: value.type,
			filename: value.name,
			data: await value.bytes()
		} : {
			name: key,
			data: new TextEncoder().encode(value)
		};
	}));
}
/** @deprecated Please use `event.req.body` */
function getBodyStream(event) {
	return event.req.body || void 0;
}
/** @deprecated Please use `event.req.body` */
const getRequestWebStream = getBodyStream;
/** @deprecated Please directly return stream */
function sendStream(_event, value) {
	return value;
}
/** @deprecated Please use `return noContent(event)` */
const sendNoContent = noContent;
/** @deprecated Please use `return redirect(event, code)` */
const sendRedirect = redirect;
/** @deprecated Please directly return response */
const sendWebResponse = (response) => response;
/** @deprecated Please use `return proxy(event)` */
const sendProxy = proxy;
/** @deprecated Please use `return iterable(event, value)` */
const sendIterable = iterable;
/** @deprecated Please use `event.res.statusText` */
function getResponseStatusText(event) {
	return event.res.statusText || "";
}
/** @deprecated Please use `event.res.headers.append(name, value)` */
function appendResponseHeader(event, name, value) {
	if (Array.isArray(value)) for (const valueItem of value) event.res.headers.append(name, valueItem);
	else event.res.headers.append(name, value);
}
/** @deprecated Please use `event.res.headers.append(name, value)` */
const appendHeader = appendResponseHeader;
/** @deprecated Please use `event.res.headers.set(name, value)` */
function setResponseHeader(event, name, value) {
	if (Array.isArray(value)) {
		event.res.headers.delete(name);
		for (const valueItem of value) event.res.headers.append(name, valueItem);
	} else event.res.headers.set(name, value);
}
/** @deprecated Please use `event.res.headers.set(name, value)` */
const setHeader = setResponseHeader;
/** @deprecated Please use `event.res.headers.set(name, value)` */
function setResponseHeaders(event, headers) {
	for (const [name, value] of Object.entries(headers)) event.res.headers.set(name, value);
}
/** @deprecated Please use `event.res.headers.set(name, value)` */
const setHeaders = setResponseHeaders;
/** @deprecated Please use `event.res.status` */
function getResponseStatus(event) {
	return event.res.status || 200;
}
/** @deprecated Please directly set `event.res.status` and `event.res.statusText` */
function setResponseStatus(event, code, text) {
	if (code) event.res.status = sanitizeStatusCode(code, event.res.status);
	if (text) event.res.statusText = sanitizeStatusMessage(text);
}
/** @deprecated Please use `event.res.headers.set("content-type", type)` */
function defaultContentType(event, type) {
	if (type && event.res.status !== 304 && !event.res.headers.has("content-type")) event.res.headers.set("content-type", type);
}
/** @deprecated Please use `Object.fromEntries(event.res.headers.entries())` */
function getResponseHeaders(event) {
	return Object.fromEntries(event.res.headers.entries());
}
/** @deprecated Please use `event.res.headers.get(name)` */
function getResponseHeader(event, name) {
	return event.res.headers.get(name) || void 0;
}
/** @deprecated Please use `event.res.headers.delete(name)` instead. */
function removeResponseHeader(event, name) {
	return event.res.headers.delete(name);
}
/** @deprecated Please use `event.res.headers.append(name, value)` */
function appendResponseHeaders(event, headers) {
	for (const [name, value] of Object.entries(headers)) appendResponseHeader(event, name, value);
}
/** @deprecated Please use `event.res.headers.append(name, value)` */
const appendHeaders = appendResponseHeaders;
/** @deprecated Please use `event.res.headers.delete` */
function clearResponseHeaders(event, headerNames) {
	if (headerNames && headerNames.length > 0) for (const name of headerNames) event.res.headers.delete(name);
	else for (const name of event.res.headers.keys()) event.res.headers.delete(name);
}
/** Please use `defineHandler`  */
const defineEventHandler = defineHandler;
/** Please use `defineHandler`  */
const eventHandler = defineHandler;
/** Please use `defineLazyEventHandler` */
const lazyEventHandler = defineLazyEventHandler;
/** @deprecated Please use `defineNodeHandler` */
const defineNodeListener = defineNodeHandler;
/** @deprecated Please use `defineNodeHandler` */
const fromNodeMiddleware = fromNodeHandler;
/** @deprecated Please use `toNodeHandler` */
const toNodeListener = toNodeHandler$1;
/** @deprecated */
function toEventHandler(input, _, _route) {
	return input;
}
/** @deprecated Please use `new H3()` */
const createApp = (config) => new H3(config);
/** @deprecated Please use `new H3()` */
const createRouter$1 = (config) => new H3(config);
/** @deprecated Please use `withBase()` */
const useBase = withBase;

//#endregion
export { H3, H3Core, H3Error, H3Event, HTTPError, appendCorsHeaders, appendCorsPreflightHeaders, appendHeader, appendHeaders, appendResponseHeader, appendResponseHeaders, assertMethod, basicAuth, clearResponseHeaders, clearSession, createApp, createError, createEventStream, createRouter$1 as createRouter, defaultContentType, defineEventHandler, defineHandler, defineLazyEventHandler, defineMiddleware, defineNodeHandler, defineNodeListener, defineNodeMiddleware, definePlugin, defineRoute, defineValidatedHandler, defineWebSocket, defineWebSocketHandler, deleteCookie, dynamicEventHandler, eventHandler, fetchWithEvent, freezeApp, fromNodeHandler, fromNodeMiddleware, fromWebHandler, getBodyStream, getCookie, getEventContext, getHeader, getHeaders, getMethod, getProxyRequestHeaders, getQuery, getRequestFingerprint, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestPath, getRequestProtocol, getRequestURL, getRequestWebStream, getResponseHeader, getResponseHeaders, getResponseStatus, getResponseStatusText, getRouterParam, getRouterParams, getSession, getValidatedQuery, getValidatedRouterParams, handleCacheHeaders, handleCors, html, isCorsOriginAllowed, isError, isEvent, isHTTPEvent, isMethod, isPreflightRequest, iterable, lazyEventHandler, mockEvent, noContent, onError, onRequest, onResponse, parseCookies, proxy, proxyRequest, readBody, readFormData, readFormDataBody, readMultipartFormData, readRawBody, readValidatedBody, redirect, removeResponseHeader, requireBasicAuth, sanitizeStatusCode, sanitizeStatusMessage, sealSession, sendIterable, sendNoContent, sendProxy, sendRedirect, sendStream, sendWebResponse, serveStatic, setCookie, setHeader, setHeaders, setResponseHeader, setResponseHeaders, setResponseStatus, toEventHandler, toNodeHandler$1 as toNodeHandler, toNodeListener, toRequest, toResponse, toWebHandler, unsealSession, updateSession, useBase, useSession, withBase, writeEarlyHints };