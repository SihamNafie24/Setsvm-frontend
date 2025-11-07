import { MatchedRoute, RouterContext } from "rou3";
import { NodeServerRequest, NodeServerResponse, ServerRequest, ServerRequestContext, ServerRuntimeContext } from "srvx";
import { CookieSerializeOptions } from "cookie-es";
import { ResponseHeaderMap, TypedRequest, TypedResponse } from "fetchdts";
import { Hooks } from "crossws";

//#region src/utils/internal/session.d.ts
declare const kGetSession: unique symbol;
//#endregion
//#region src/utils/internal/iron-crypto.d.ts

// --- Types ---
/** Algorithm used for encryption and decryption. */
type EncryptionAlgorithm = "aes-128-ctr" | "aes-256-cbc";
/** Algorithm used for integrity verification. */
type IntegrityAlgorithm = "sha256";
/** @internal */
type _Algorithm = EncryptionAlgorithm | IntegrityAlgorithm;
/**
* Options for customizing the key derivation algorithm used to generate encryption and integrity verification keys as well as the algorithms and salt sizes used.
*/
type SealOptions = Readonly<{
  /** Encryption step options. */
  encryption: SealOptionsSub<EncryptionAlgorithm>;
  /** Integrity step options. */
  integrity: SealOptionsSub<IntegrityAlgorithm>;
  /*Sealed object lifetime in milliseconds where 0 means forever. Defaults to 0. */
  ttl: number;
  /** Number of seconds of permitted clock skew for incoming expirations. Defaults to 60 seconds. */
  timestampSkewSec: number;
  /**
  * Local clock time offset, expressed in number of milliseconds (positive or negative). Defaults to 0.
  */
  localtimeOffsetMsec: number;
}>;
/** `seal()` method options. */
type SealOptionsSub<Algorithm extends _Algorithm = _Algorithm> = Readonly<{
  /** The length of the salt (random buffer used to ensure that two identical objects will generate a different encrypted result). Defaults to 256. */
  saltBits: number;
  /** The algorithm used. Defaults to 'aes-256-cbc' for encryption and 'sha256' for integrity. */
  algorithm: Algorithm;
  /** The number of iterations used to derive a key from the password. Defaults to 1. */
  iterations: number;
  /** Minimum password size. Defaults to 32. */
  minPasswordlength: number;
}>;
/** Password secret string or buffer.*/
//#endregion
//#region src/utils/session.d.ts
type SessionDataT = Record<string, any>;
type SessionData<T extends SessionDataT = SessionDataT> = Partial<T>;
interface Session<T extends SessionDataT = SessionDataT> {
  id: string;
  createdAt: number;
  data: SessionData<T>;
  [kGetSession]?: Promise<Session<T>>;
}
interface SessionManager<T extends SessionDataT = SessionDataT> {
  readonly id: string | undefined;
  readonly data: SessionData<T>;
  update: (update: SessionUpdate<T>) => Promise<SessionManager<T>>;
  clear: () => Promise<SessionManager<T>>;
}
interface SessionConfig {
  /** Private key used to encrypt session tokens */
  password: string;
  /** Session expiration time in seconds */
  maxAge?: number;
  /** default is h3 */
  name?: string;
  /** Default is secure, httpOnly, / */
  cookie?: false | (CookieSerializeOptions & {
    chunkMaxLength?: number;
  });
  /** Default is x-h3-session / x-{name}-session */
  sessionHeader?: false | string;
  seal?: SealOptions;
  crypto?: Crypto;
  /** Default is Crypto.randomUUID */
  generateId?: () => string;
}
/**
* Create a session manager for the current request.
*
*/
declare function useSession<T extends SessionData = SessionData>(event: HTTPEvent, config: SessionConfig): Promise<SessionManager<T>>;
/**
* Get the session for the current request.
*/
declare function getSession<T extends SessionData = SessionData>(event: HTTPEvent, config: SessionConfig): Promise<Session<T>>;
type SessionUpdate<T extends SessionData = SessionData> = Partial<SessionData<T>> | ((oldData: SessionData<T>) => Partial<SessionData<T>> | undefined);
/**
* Update the session data for the current request.
*/
declare function updateSession<T extends SessionData = SessionData>(event: HTTPEvent, config: SessionConfig, update?: SessionUpdate<T>): Promise<Session<T>>;
/**
* Encrypt and sign the session data for the current request.
*/
declare function sealSession<T extends SessionData = SessionData>(event: HTTPEvent, config: SessionConfig): Promise<string>;
/**
* Decrypt and verify the session data for the current request.
*/
declare function unsealSession(_event: HTTPEvent, config: SessionConfig, sealed: string): Promise<Partial<Session>>;
/**
* Clear the session data for the current request.
*/
declare function clearSession(event: HTTPEvent, config: Partial<SessionConfig>): Promise<void>;
//#endregion
//#region src/types/_utils.d.ts
type MaybePromise<T = unknown> = T | Promise<T>;
//#endregion
//#region src/types/handler.d.ts
//  --- event handler ---
interface EventHandler<_RequestT extends EventHandlerRequest = EventHandlerRequest, _ResponseT extends EventHandlerResponse = EventHandlerResponse> {
  (event: H3Event<_RequestT>): _ResponseT;
  meta?: H3RouteMeta;
}
type EventHandlerFetch<T extends Response | TypedResponse = Response> = (req: ServerRequest | URL | string) => Promise<T>;
interface EventHandlerObject<_RequestT extends EventHandlerRequest = EventHandlerRequest, _ResponseT extends EventHandlerResponse = EventHandlerResponse> {
  handler: EventHandler<_RequestT, _ResponseT>;
  middleware?: Middleware[];
  meta?: H3RouteMeta;
}
interface EventHandlerRequest {
  body?: unknown;
  query?: Partial<Record<string, string>>;
  routerParams?: Record<string, string>;
}
type EventHandlerResponse<T = unknown> = T | Promise<T>;
type EventHandlerWithFetch<_RequestT extends EventHandlerRequest = EventHandlerRequest, _ResponseT extends EventHandlerResponse = EventHandlerResponse> = EventHandler<_RequestT, _ResponseT> & {
  fetch: EventHandlerFetch<TypedResponse<_ResponseT, ResponseHeaderMap>>;
};
type TypedServerRequest<_RequestT extends EventHandlerRequest = EventHandlerRequest> = Omit<ServerRequest, "json" | "headers" | "clone"> & Pick<TypedRequest<NonNullable<_RequestT["body"]>, Record<keyof ResponseHeaderMap, string>>, "json" | "headers" | "clone">;
//  --- middleware ---
type Middleware = (event: H3Event, next: () => MaybePromise<unknown | undefined>) => MaybePromise<unknown | undefined>;
// --- lazy event handler ---
type LazyEventHandler = () => EventHandler | Promise<EventHandler>;
interface DynamicEventHandler extends EventHandlerWithFetch {
  set: (handler: EventHandler) => void;
}
// --- utils ---
type InferEventInput<Key extends keyof EventHandlerRequest, Event extends HTTPEvent, T> = void extends T ? (Event extends HTTPEvent<infer E> ? E[Key] : never) : T;
//#endregion
//#region src/error.d.ts
/**
* Raw object describing HTTP error (passed to `HTTPError` constructor).
*/
interface ErrorInput<DataT = unknown> extends Partial<ErrorBody<DataT>> {
  /**
  * Original error object that caused this error.
  */
  cause?: unknown;
  /**
  * Additional HTTP headers to be sent in error response.
  */
  headers?: HeadersInit;
  /**
  * @deprecated use `status`
  */
  statusCode?: number;
  /**
  * @deprecated use `statusText`
  */
  statusMessage?: string;
}
type ErrorDetails = (Error & {
  cause?: unknown;
}) | HTTPError | ErrorInput;
interface ErrorBody<DataT = unknown> {
  /**
  * HTTP status code in range [200...599]
  */
  status: number;
  /**
  * HTTP status text
  *
  * **NOTE:** This should be short (max 512 to 1024 characters).
  * Allowed characters are tabs, spaces, visible ASCII characters, and extended characters (byte value 128–255).
  *
  * **TIP:** Use `message` for longer error descriptions in JSON body.
  */
  statusText?: string;
  /**
  * HTTP Error message.
  *
  * **NOTE:** This message will be in JSON body under `message` key.
  */
  message: string;
  /**
  * Flag to indicate that the error was not handled by the application.
  *
  * Unhandled error stack trace, `data`, `body` and `message` are hidden for security reasons.
  */
  unhandled?: boolean;
  /**
  * Additional data to attach in the error JSON body under `data` key.
  */
  data?: DataT;
  /**
  * Additional top level JSON body properties to attach in the error JSON body.
  */
  body?: Record<string, unknown>;
}
/**
* HTTPError
*/
declare class HTTPError<DataT = unknown> extends Error implements ErrorBody<DataT> {
  get name(): string;
  /**
  * HTTP status code in range [200...599]
  */
  readonly status: number;
  /**
  * HTTP status text
  *
  * **NOTE:** This should be short (max 512 to 1024 characters).
  * Allowed characters are tabs, spaces, visible ASCII characters, and extended characters (byte value 128–255).
  *
  * **TIP:** Use `message` for longer error descriptions in JSON body.
  */
  readonly statusText: string | undefined;
  /**
  * Additional HTTP headers to be sent in error response.
  */
  readonly headers: Headers | undefined;
  /**
  * Original error object that caused this error.
  */
  readonly cause: unknown | undefined;
  /**
  * Additional data attached in the error JSON body under `data` key.
  */
  readonly data: DataT | undefined;
  /**
  * Additional top level JSON body properties to attach in the error JSON body.
  */
  readonly body: Record<string, unknown> | undefined;
  /**
  * Flag to indicate that the error was not handled by the application.
  *
  * Unhandled error stack trace, data and message are hidden in non debug mode for security reasons.
  */
  readonly unhandled: boolean | undefined;
  /**
  * Check if the input is an instance of HTTPError using its constructor name.
  *
  * It is safer than using `instanceof` because it works across different contexts (e.g., if the error was thrown in a different module).
  */
  static isError(input: any): input is HTTPError;
  /**
  * Create a new HTTPError with the given status code and optional status text and details.
  *
  * @example
  *
  * HTTPError.status(404)
  * HTTPError.status(418, "I'm a teapot")
  * HTTPError.status(403, "Forbidden", { message: "Not authenticated" })
  */
  static status(status: number, statusText?: string, details?: Exclude<ErrorDetails, "status" | "statusText" | "statusCode" | "statusMessage">): HTTPError;
  /**
  * Create a new HTTPError with the given message and optional details.
  *
  * @example
  *
  * new HTTPError("This is an error", { status: 400, cause: error })
  * new HTTPError({ message: "This is an error", status: 500, statusText: "Not Found", data: {} })
  */
  constructor(message: string, details?: ErrorDetails);
  constructor(details: ErrorDetails);
  /**
  * @deprecated Use `status`
  */
  get statusCode(): number;
  /**
  * @deprecated Use `statusText`
  */
  get statusMessage(): string | undefined;
  toJSON(): ErrorBody;
}
//#endregion
//#region src/types/h3.d.ts
// --- Misc ---
// https://www.rfc-editor.org/rfc/rfc7231#section-4.1
// prettier-ignore
type HTTPMethod = "GET" | "HEAD" | "PATCH" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE";
interface H3Config {
  /**
  * When enabled, H3 displays debugging stack traces in HTTP responses (potentially dangerous for production!).
  */
  debug?: boolean;
  /**
  * When enabled, H3 console errors for unhandled exceptions will not be displayed.
  */
  silent?: boolean;
  plugins?: H3Plugin[];
  onRequest?: (event: H3Event) => MaybePromise<void>;
  onResponse?: (response: Response, event: H3Event) => MaybePromise<void>;
  onError?: (error: HTTPError, event: H3Event) => MaybePromise<void | unknown>;
}
type PreparedResponse = ResponseInit & {
  body?: BodyInit | null;
};
interface H3RouteMeta {
  readonly [key: string]: unknown;
}
interface H3Route {
  route?: string;
  method?: HTTPMethod;
  middleware?: Middleware[];
  meta?: H3RouteMeta;
  handler: EventHandler;
}
// --- H3 Pluins ---
type H3Plugin = (h3: H3$1) => void;
declare function definePlugin<T = unknown>(def: (h3: H3$1, options: T) => void): undefined extends T ? (options?: T) => H3Plugin : (options: T) => H3Plugin;
// --- H3 App ---
type FetchHandler = (req: ServerRequest) => Response | Promise<Response>;
type RouteOptions = {
  middleware?: Middleware[];
  meta?: H3RouteMeta;
};
type MiddlewareOptions = {
  method?: string;
  match?: (event: H3Event) => boolean;
};
declare class H3$1 {
  /**
  * @internal
  */
  _middleware: Middleware[];
  /**
  * @internal
  */
  _routes: H3Route[];
  /**
  * H3 instance config.
  */
  readonly config: H3Config;
  /**
  * Create a new H3 app instance.
  */
  constructor(config?: H3Config);
  /**
  * A [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)-compatible API allowing to fetch app routes.
  *
  * Input should be standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object.
  *
  * Returned value is a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) Promise.
  */
  fetch(_request: ServerRequest): Response | Promise<Response>;
  /**
  * A [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)-compatible API allowing to fetch app routes.
  *
  * Input can be a URL, relative path or standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object.
  *
  * Returned value is a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) Promise.
  */
  request(request: ServerRequest | URL | string, options?: RequestInit, context?: H3EventContext): Response | Promise<Response>;
  /**
  * @internal
  */
  _findRoute(_event: H3Event): MatchedRoute<H3Route> | void;
  /**
  * @internal
  */
  _addRoute(_route: H3Route): void;
  /**
  * Immediately register an H3 plugin.
  */
  register(plugin: H3Plugin): this;
  /**
  * An h3 compatible event handler useful to compose multiple h3 app instances.
  */
  handler(event: H3Event): unknown | Promise<unknown>;
  /**
  * Mount an H3 app or a `.fetch` compatible server (like Hono or Elysia) with a base prefix.
  *
  * When mounting a sub-app, all routes will be added with base prefix and global middleware will be added as one prefixed middleware.
  *
  * **Note:** Sub-app options and global hooks are not inherited by the mounted app please consider setting them in the main app directly.
  */
  mount(base: string, input: FetchHandler | {
    fetch: FetchHandler;
  } | H3$1): this;
  /**
  * Register a global middleware.
  */
  use(route: string, handler: Middleware, opts?: MiddlewareOptions): this;
  use(handler: Middleware, opts?: MiddlewareOptions): this;
  /**
  * Register a route handler for the specified HTTP method and route.
  */
  on(method: HTTPMethod | Lowercase<HTTPMethod> | "", route: string, handler: EventHandler, opts?: RouteOptions): this;
  /**
  * Register a route handler for all HTTP methods.
  */
  all(route: string, handler: EventHandler, opts?: RouteOptions): this;
  get(route: string, handler: EventHandler, opts?: RouteOptions): this;
  post(route: string, handler: EventHandler, opts?: RouteOptions): this;
  put(route: string, handler: EventHandler, opts?: RouteOptions): this;
  delete(route: string, handler: EventHandler, opts?: RouteOptions): this;
  patch(route: string, handler: EventHandler, opts?: RouteOptions): this;
  head(route: string, handler: EventHandler, opts?: RouteOptions): this;
  options(route: string, handler: EventHandler, opts?: RouteOptions): this;
  connect(route: string, handler: EventHandler, opts?: RouteOptions): this;
  trace(route: string, handler: EventHandler, opts?: RouteOptions): this;
}
//#endregion
//#region src/types/context.d.ts
interface H3EventContext extends ServerRequestContext {
  /* Matched router parameters */
  params?: Record<string, string>;
  /* Matched middleware parameters */
  middlewareParams?: Record<string, string>;
  /**
  * Matched router Node
  *
  * @experimental The object structure may change in non-major version.
  */
  matchedRoute?: H3Route;
  /* Cached session data */
  sessions?: Record<string, Session>;
  /* Trusted IP Address of client */
  clientAddress?: string;
  /* Basic authentication data */
  basicAuth?: {
    username?: string;
    password?: string;
    realm?: string;
  };
}
//#endregion
//#region src/event.d.ts
interface HTTPEvent<_RequestT extends EventHandlerRequest = EventHandlerRequest> {
  /**
  * Incoming HTTP request info.
  *
  * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Request)
  */
  req: TypedServerRequest<_RequestT>;
}
declare class H3Event<_RequestT extends EventHandlerRequest = EventHandlerRequest> implements HTTPEvent<_RequestT> {
  /**
  * Access to the H3 application instance.
  */
  app?: H3Core;
  /**
  * Incoming HTTP request info.
  *
  * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Request)
  */
  readonly req: TypedServerRequest<_RequestT>;
  /**
  * Access to the parsed request URL.
  *
  * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URL)
  */
  url: URL;
  /**
  * Event context.
  */
  readonly context: H3EventContext;
  /**
  * @internal
  */
  static __is_event__: boolean;
  /**
  * @internal
  */
  _res?: H3EventResponse;
  constructor(req: ServerRequest, context?: H3EventContext, app?: H3Core);
  /**
  * Prepared HTTP response.
  */
  get res(): H3EventResponse;
  /**
  * Access to runtime specific additional context.
  *
  */
  get runtime(): ServerRuntimeContext | undefined;
  /**
  * Tell the runtime about an ongoing operation that shouldn't close until the promise resolves.
  */
  waitUntil(promise: Promise<any>): void;
  toString(): string;
  toJSON(): string;
  // ------------- deprecated  ---------------
  /**
  * Access to the raw Node.js req/res objects.
  *
  * @deprecated Use `event.runtime.{node|deno|bun|...}.` instead.
  */
  get node(): ServerRuntimeContext["node"] | undefined;
  /**
  * Access to the incoming request headers.
  *
  * @deprecated Use `event.req.headers` instead.
  *
  */
  get headers(): Headers;
  /**
  * Access to the incoming request url (pathname+search).
  *
  * @deprecated Use `event.url.pathname + event.url.search` instead.
  *
  * Example: `/api/hello?name=world`
  * */
  get path(): string;
  /**
  * Access to the incoming request method.
  *
  * @deprecated Use `event.req.method` instead.
  */
  get method(): string;
}
declare class H3EventResponse {
  status?: number;
  statusText?: string;
  _headers?: Headers;
  get headers(): Headers;
}
//#endregion
//#region src/h3.d.ts
type H3Core = H3$1;
declare const H3Core: {
  new (config?: H3Config): H3$1;
};
declare class H3 extends H3Core {
  /**
  * @internal
  */
  _rou3: RouterContext<H3Route>;
  constructor(config?: H3Config);
  _findRoute(_event: H3Event): MatchedRoute<H3Route> | void;
  _addRoute(_route: H3Route): void;
}
//#endregion
//#region src/utils/event.d.ts
/**
* Checks if the input is an H3Event object.
* @param input - The input to check.
* @returns True if the input is an H3Event object, false otherwise.
* @see H3Event
*/
declare function isEvent(input: any): input is H3Event;
/**
* Checks if the input is an object with `{ req: Request }` signature.
* @param input - The input to check.
* @returns True if the input is is `{ req: Request }`
*/
declare function isHTTPEvent(input: any): input is HTTPEvent;
/**
* Gets the context of the event, if it does not exists, initializes a new context on `req.context`.
*/
declare function getEventContext<T extends ServerRequestContext | H3EventContext>(event: HTTPEvent | H3Event): T;
declare function mockEvent(_request: string | URL | Request, options?: RequestInit & {
  h3?: H3EventContext;
}): H3Event;
//#endregion
//#region src/utils/internal/standard-schema.d.ts
// https://github.com/standard-schema/standard-schema
/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly "~standard": Props<Input, Output>;
}
/** The Standard Schema properties interface. */
interface Props<Input = unknown, Output = Input> {
  /** The version number of the standard. */
  readonly version: 1;
  /** The vendor name of the schema library. */
  readonly vendor: string;
  /** Validates unknown input values. */
  readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
  /** Inferred types associated with the schema. */
  readonly types?: Types<Input, Output> | undefined;
}
/** The result interface of the validate function. */
type Result<Output> = SuccessResult<Output> | FailureResult;
/** The result interface if validation succeeds. */
interface SuccessResult<Output> {
  /** The typed output value. */
  readonly value: Output;
  /** The non-existent issues. */
  readonly issues?: undefined;
}
/** The result interface if validation fails. */
interface FailureResult {
  /** The issues of failed validation. */
  readonly issues: ReadonlyArray<Issue>;
}
/** The issue interface of the failure output. */
interface Issue {
  /** The error message of the issue. */
  readonly message: string;
  /** The path of the issue, if any. */
  readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
}
/** The path segment interface of the issue. */
interface PathSegment {
  /** The key representing a path segment. */
  readonly key: PropertyKey;
}
/** The Standard Schema types interface. */
interface Types<Input = unknown, Output = Input> {
  /** The input type of the schema. */
  readonly input: Input;
  /** The output type of the schema. */
  readonly output: Output;
}
/** Infers the input type of a Standard Schema. */

/** Infers the output type of a Standard Schema. */
type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["output"];
//#endregion
//#region src/handler.d.ts
// --- event handler ---
declare function defineHandler<Req extends EventHandlerRequest = EventHandlerRequest, Res = EventHandlerResponse>(handler: EventHandler<Req, Res>): EventHandlerWithFetch<Req, Res>;
declare function defineHandler<Req extends EventHandlerRequest = EventHandlerRequest, Res = EventHandlerResponse>(def: EventHandlerObject<Req, Res>): EventHandlerWithFetch<Req, Res>;
type StringHeaders<T> = { [K in keyof T]: Extract<T[K], string> };
/**
* @experimental defineValidatedHandler is an experimental feature and API may change.
*/
declare function defineValidatedHandler<RequestBody extends StandardSchemaV1, RequestHeaders extends StandardSchemaV1, RequestQuery extends StandardSchemaV1, Res extends EventHandlerResponse = EventHandlerResponse>(def: Omit<EventHandlerObject, "handler"> & {
  validate?: {
    body?: RequestBody;
    headers?: RequestHeaders;
    query?: RequestQuery;
  };
  handler: EventHandler<{
    body: InferOutput<RequestBody>;
    query: StringHeaders<InferOutput<RequestQuery>>;
  }, Res>;
}): EventHandlerWithFetch<TypedRequest<InferOutput<RequestBody>, InferOutput<RequestHeaders>>, Res>;
//  --- dynamic event handler ---
declare function dynamicEventHandler(initial?: EventHandler): DynamicEventHandler;
// --- lazy event handler ---
declare function defineLazyEventHandler(load: () => Promise<EventHandler> | EventHandler): EventHandlerWithFetch;
//#endregion
//#region src/middleware.d.ts
declare function defineMiddleware(input: Middleware): Middleware;
//#endregion
//#region src/response.d.ts
declare function toResponse(val: unknown, event: H3Event, config?: H3Config): Response | Promise<Response>;
//#endregion
//#region src/adapters.d.ts
type NodeHandler = (req: NodeServerRequest, res: NodeServerResponse) => unknown | Promise<unknown>;
type NodeMiddleware = (req: NodeServerRequest, res: NodeServerResponse, next: (error?: Error) => void) => unknown | Promise<unknown>;
/**
* @deprecated Since h3 v2 you can directly use `app.fetch(request, init?, context?)`
*/
declare function toWebHandler(app: H3): (request: ServerRequest, context?: H3EventContext) => Promise<Response>;
declare function fromWebHandler(handler: (request: ServerRequest, context?: H3EventContext) => Promise<Response>): EventHandler;
/**
* Convert a Node.js handler function (req, res, next?) to an EventHandler.
*
* **Note:** The returned event handler requires to be executed with h3 Node.js handler.
*/
declare function fromNodeHandler(handler: NodeMiddleware): EventHandler;
declare function fromNodeHandler(handler: NodeHandler): EventHandler;
declare function defineNodeHandler(handler: NodeHandler): NodeHandler;
declare function defineNodeMiddleware(handler: NodeMiddleware): NodeMiddleware;
/**
* Convert H3 app instance to a NodeHandler with (IncomingMessage, ServerResponse) => void signature.
*/
declare function toNodeHandler(app: H3): NodeHandler;
//#endregion
//#region src/utils/route.d.ts
/**
* Route definition options
*/
interface RouteDefinition {
  /**
  * HTTP method for the route, e.g. 'GET', 'POST', etc.
  */
  method: HTTPMethod;
  /**
  * Route pattern, e.g. '/api/users/:id'
  */
  route: string;
  /**
  * Handler function for the route.
  */
  handler: EventHandler;
  /**
  * Optional middleware to run before the handler.
  */
  middleware?: Middleware[];
  /**
  * Additional route metadata.
  */
  meta?: H3RouteMeta;
  // Validation schemas
  // TODO: Support generics for better typing `handler` input
  validate?: {
    body?: StandardSchemaV1;
    headers?: StandardSchemaV1;
    query?: StandardSchemaV1;
  };
}
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
declare function defineRoute(def: RouteDefinition): H3Plugin;
//#endregion
//#region src/utils/internal/validate.d.ts
type ValidateResult<T> = T | true | false | void;
//#endregion
//#region src/utils/request.d.ts
/**
* Convert input into a web [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request).
*
* If input is a relative URL, it will be normalized into a full path based on headers.
*
* If input is already a Request and no options are provided, it will be returned as-is.
*/
declare function toRequest(input: ServerRequest | URL | string, options?: RequestInit): ServerRequest;
/**
* Get parsed query string object from the request URL.
*
* @example
* app.get("/", (event) => {
*   const query = getQuery(event); // { key: "value", key2: ["value1", "value2"] }
* });
*/
declare function getQuery<T, Event extends H3Event | HTTPEvent = HTTPEvent, _T = Exclude<InferEventInput<"query", Event, T>, undefined>>(event: Event): _T;
declare function getValidatedQuery<Event extends HTTPEvent, S extends StandardSchemaV1<any, any>>(event: Event, validate: S): Promise<InferOutput<S>>;
declare function getValidatedQuery<Event extends HTTPEvent, OutputT, InputT = InferEventInput<"query", Event, OutputT>>(event: Event, validate: (data: InputT) => ValidateResult<OutputT> | Promise<ValidateResult<OutputT>>): Promise<OutputT>;
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
declare function getRouterParams(event: HTTPEvent, opts?: {
  decode?: boolean;
}): NonNullable<H3Event["context"]["params"]>;
declare function getValidatedRouterParams<Event extends HTTPEvent, S extends StandardSchemaV1>(event: Event, validate: S, opts?: {
  decode?: boolean;
}): Promise<InferOutput<S>>;
declare function getValidatedRouterParams<Event extends HTTPEvent, OutputT, InputT = InferEventInput<"routerParams", Event, OutputT>>(event: Event, validate: (data: InputT) => ValidateResult<OutputT> | Promise<ValidateResult<OutputT>>, opts?: {
  decode?: boolean;
}): Promise<OutputT>;
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
declare function getRouterParam(event: HTTPEvent, name: string, opts?: {
  decode?: boolean;
}): string | undefined;
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
declare function isMethod(event: HTTPEvent, expected: HTTPMethod | HTTPMethod[], allowHead?: boolean): boolean;
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
declare function assertMethod(event: HTTPEvent, expected: HTTPMethod | HTTPMethod[], allowHead?: boolean): void;
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
declare function getRequestHost(event: HTTPEvent, opts?: {
  xForwardedHost?: boolean;
}): string;
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
declare function getRequestProtocol(event: HTTPEvent | H3Event, opts?: {
  xForwardedProto?: boolean;
}): "http" | "https" | (string & {});
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
declare function getRequestURL(event: HTTPEvent | H3Event, opts?: {
  xForwardedHost?: boolean;
  xForwardedProto?: boolean;
}): URL;
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
declare function getRequestIP(event: HTTPEvent, opts?: {
  /**
  * Use the X-Forwarded-For HTTP header set by proxies.
  *
  * Note: Make sure that this header can be trusted (your application running behind a CDN or reverse proxy) before enabling.
  */
  xForwardedFor?: boolean;
}): string | undefined;
//#endregion
//#region src/utils/internal/iterable.d.ts
type IterationSource<Val, Ret = Val> = Iterable<Val> | AsyncIterable<Val> | Iterator<Val, Ret | undefined> | AsyncIterator<Val, Ret | undefined> | (() => Iterator<Val, Ret | undefined> | AsyncIterator<Val, Ret | undefined>);
type IteratorSerializer<Value> = (value: Value) => Uint8Array | undefined;
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
//#endregion
//#region src/utils/response.d.ts
/**
* Respond with an empty payload.<br>
*
* @example
* app.get("/", (event) => noContent(event));
*
* @param event H3 event
* @param code status code to be send. By default, it is `204 No Content`.
*/
declare function noContent(event: H3Event, code?: number): Response;
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
declare function redirect(event: H3Event, location: string, code?: number): string;
/**
* Write `HTTP/1.1 103 Early Hints` to the client.
*/
declare function writeEarlyHints(event: H3Event, hints: Record<string, string>): void | Promise<void>;
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
declare function iterable<Value = unknown, Return = unknown>(_event: H3Event, iterable: IterationSource<Value, Return>, options?: {
  serializer: IteratorSerializer<Value | Return>;
}): ReadableStream;
/**
* Respond with HTML content.
*
* @example
* app.get("/", (event) => html(event, "<h1>Hello, World!</h1>"));
*/
declare function html(event: H3Event, content: string): string;
//#endregion
//#region src/utils/middleware.d.ts
/**
* Define a middleware that runs on each request.
*/
declare function onRequest(hook: (event: H3Event) => void | Promise<void>): Middleware;
/**
* Define a middleware that runs after Response is generated.
*
* You can return a new Response from the handler to replace the original response.
*/
declare function onResponse(hook: (response: Response, event: H3Event) => MaybePromise<void | Response>): Middleware;
/**
* Define a middleware that runs when an error occurs.
*
* You can return a new Response from the handler to gracefully handle the error.
*/
declare function onError(hook: (error: HTTPError, event: H3Event) => MaybePromise<void | unknown>): Middleware;
//#endregion
//#region src/utils/proxy.d.ts
interface ProxyOptions {
  headers?: HeadersInit;
  forwardHeaders?: string[];
  filterHeaders?: string[];
  fetchOptions?: RequestInit & {
    duplex?: "half" | "full";
  };
  cookieDomainRewrite?: string | Record<string, string>;
  cookiePathRewrite?: string | Record<string, string>;
  onResponse?: (event: H3Event, response: Response) => void;
}
/**
* Proxy the incoming request to a target URL.
*/
declare function proxyRequest(event: H3Event, target: string, opts?: ProxyOptions): Promise<BodyInit | undefined | null>;
/**
* Make a proxy request to a target URL and send the response back to the client.
*/
declare function proxy(event: H3Event, target: string, opts?: ProxyOptions): Promise<BodyInit | undefined | null>;
/**
* Get the request headers object without headers known to cause issues when proxying.
*/
declare function getProxyRequestHeaders(event: H3Event, opts?: {
  host?: boolean;
  forwardHeaders?: string[];
  filterHeaders?: string[];
}): Record<string, string>;
/**
* Make a fetch request with the event's context and headers.
*/
declare function fetchWithEvent(event: H3Event, url: string, init?: RequestInit): Promise<Response>;
//#endregion
//#region src/utils/body.d.ts
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
declare function readBody<T, _Event extends HTTPEvent = HTTPEvent, _T = InferEventInput<"body", _Event, T>>(event: _Event): Promise<undefined | _T>;
declare function readValidatedBody<Event extends HTTPEvent, S extends StandardSchemaV1>(event: Event, validate: S): Promise<InferOutput<S>>;
declare function readValidatedBody<Event extends HTTPEvent, OutputT, InputT = InferEventInput<"body", Event, OutputT>>(event: Event, validate: (data: InputT) => ValidateResult<OutputT> | Promise<ValidateResult<OutputT>>): Promise<OutputT>;
//#endregion
//#region src/utils/cookie.d.ts
/**
* Parse the request to get HTTP Cookie header string and returning an object of all cookie name-value pairs.
* @param event {HTTPEvent} H3 event or req passed by h3 handler
* @returns Object of cookie name-value pairs
* ```ts
* const cookies = parseCookies(event)
* ```
*/
declare function parseCookies(event: HTTPEvent): Record<string, string>;
/**
* Get a cookie value by name.
* @param event {HTTPEvent} H3 event or req passed by h3 handler
* @param name Name of the cookie to get
* @returns {*} Value of the cookie (String or undefined)
* ```ts
* const authorization = getCookie(request, 'Authorization')
* ```
*/
declare function getCookie(event: HTTPEvent, name: string): string | undefined;
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
declare function setCookie(event: H3Event, name: string, value: string, options?: CookieSerializeOptions): void;
/**
* Remove a cookie by name.
* @param event {H3Event} H3 event or res passed by h3 handler
* @param name Name of the cookie to delete
* @param serializeOptions {CookieSerializeOptions} Cookie options
* ```ts
* deleteCookie(res, 'SessionId')
* ```
*/
declare function deleteCookie(event: H3Event, name: string, serializeOptions?: CookieSerializeOptions): void;
/**
* Get a chunked cookie value by name. Will join chunks together.
* @param event {HTTPEvent} { req: Request }
* @param name Name of the cookie to get
* @returns {*} Value of the cookie (String or undefined)
* ```ts
* const authorization = getCookie(request, 'Session')
* ```
*/
//#endregion
//#region src/utils/internal/event-stream.d.ts
/**
* A helper class for [server sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format)
*/
declare class EventStream {
  private readonly _event;
  private readonly _transformStream;
  private readonly _writer;
  private readonly _encoder;
  private _writerIsClosed;
  private _paused;
  private _unsentData;
  private _disposed;
  private _handled;
  constructor(event: H3Event, opts?: EventStreamOptions);
  /**
  * Publish new event(s) for the client
  */
  push(message: string): Promise<void>;
  push(message: string[]): Promise<void>;
  push(message: EventStreamMessage): Promise<void>;
  push(message: EventStreamMessage[]): Promise<void>;
  pushComment(comment: string): Promise<void>;
  private _sendEvent;
  private _sendEvents;
  pause(): void;
  get isPaused(): boolean;
  resume(): Promise<void>;
  flush(): Promise<void>;
  /**
  * Close the stream and the connection if the stream is being sent to the client
  */
  close(): Promise<void>;
  /**
  * Triggers callback when the writable stream is closed.
  * It is also triggered after calling the `close()` method.
  */
  onClosed(cb: () => any): void;
  send(): Promise<BodyInit>;
}
//#endregion
//#region src/utils/event-stream.d.ts
interface EventStreamOptions {
  /**
  * Automatically close the writable stream when the request is closed
  *
  * Default is `true`
  */
  autoclose?: boolean;
}
/**
* See https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#fields
*/
interface EventStreamMessage {
  id?: string;
  event?: string;
  retry?: number;
  data: string;
}
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
declare function createEventStream(event: H3Event, opts?: EventStreamOptions): EventStream;
//#endregion
//#region src/utils/sanitize.d.ts
/**
* Make sure the status message is safe to use in a response.
*
* Allowed characters: horizontal tabs, spaces or visible ascii characters: https://www.rfc-editor.org/rfc/rfc7230#section-3.1.2
*/
declare function sanitizeStatusMessage(statusMessage?: string): string;
/**
* Make sure the status code is a valid HTTP status code.
*/
declare function sanitizeStatusCode(statusCode?: string | number, defaultStatusCode?: number): number;
//#endregion
//#region src/utils/cache.d.ts
interface CacheConditions {
  modifiedTime?: string | Date;
  maxAge?: number;
  etag?: string;
  cacheControls?: string[];
}
/**
* Check request caching headers (`If-Modified-Since`) and add caching headers (Last-Modified, Cache-Control)
* Note: `public` cache control will be added by default
* @returns `true` when cache headers are matching. When `true` is returned, no response should be sent anymore
*/
declare function handleCacheHeaders(event: H3Event, opts: CacheConditions): boolean;
//#endregion
//#region src/utils/static.d.ts
interface StaticAssetMeta {
  type?: string;
  etag?: string;
  mtime?: number | string | Date;
  path?: string;
  size?: number;
  encoding?: string;
}
interface ServeStaticOptions {
  /**
  * This function should resolve asset meta
  */
  getMeta: (id: string) => StaticAssetMeta | undefined | Promise<StaticAssetMeta | undefined>;
  /**
  * This function should resolve asset content
  */
  getContents: (id: string) => BodyInit | null | undefined | Promise<BodyInit | null | undefined>;
  /**
  * Headers to set on the response
  */
  headers?: HeadersInit;
  /**
  * Map of supported encodings (compressions) and their file extensions.
  *
  * Each extension will be appended to the asset path to find the compressed version of the asset.
  *
  * @example { gzip: ".gz", br: ".br" }
  */
  encodings?: Record<string, string>;
  /**
  * Default index file to serve when the path is a directory
  *
  * @default ["/index.html"]
  */
  indexNames?: string[];
  /**
  * When set to true, the function will not throw 404 error when the asset meta is not found or meta validation failed
  */
  fallthrough?: boolean;
  /**
  * Custom MIME type resolver function
  * @param ext - File extension including dot (e.g., ".css", ".js")
  */
  getType?: (ext: string) => string | undefined;
}
/**
* Dynamically serve static assets based on the request path.
*/
declare function serveStatic(event: H3Event, options: ServeStaticOptions): Promise<false | undefined | null | BodyInit>;
//#endregion
//#region src/utils/base.d.ts
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
declare function withBase(base: string, input: EventHandler | H3): EventHandler;
//#endregion
//#region src/utils/internal/cors.d.ts
/**
* Check if the origin is allowed.
*/
declare function isCorsOriginAllowed(origin: string | null | undefined, options: CorsOptions): boolean;
/**
* Create the `access-control-allow-origin` header.
*/
//#endregion
//#region src/utils/cors.d.ts
interface CorsOptions {
  /**
  * This determines the value of the "access-control-allow-origin" response header.
  * If "*", it can be used to allow all origins.
  * If an array of strings or regular expressions, it can be used with origin matching.
  * If a custom function, it's used to validate the origin. It takes the origin as an argument and returns `true` if allowed.
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
  * @default "*"
  */
  origin?: "*" | "null" | (string | RegExp)[] | ((origin: string) => boolean);
  /**
  * This determines the value of the "access-control-allow-methods" response header of a preflight request.
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods
  * @default "*"
  * @example ["GET", "HEAD", "PUT", "POST"]
  */
  methods?: "*" | string[];
  /**
  * This determines the value of the "access-control-allow-headers" response header of a preflight request.
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers
  * @default "*"
  */
  allowHeaders?: "*" | string[];
  /**
  * This determines the value of the "access-control-expose-headers" response header.
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers
  * @default "*"
  */
  exposeHeaders?: "*" | string[];
  /**
  * This determines the value of the "access-control-allow-credentials" response header.
  * When request with credentials, the options that `origin`, `methods`, `exposeHeaders` and `allowHeaders` should not be set "*".
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials
  * @see https://fetch.spec.whatwg.org/#cors-protocol-and-credentials
  * @default false
  */
  credentials?: boolean;
  /**
  * This determines the value of the "access-control-max-age" response header of a preflight request.
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
  * @default false
  */
  maxAge?: string | false;
  /**
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers
  */
  preflight?: {
    statusCode?: number;
  };
}
/**
* Check if the incoming request is a CORS preflight request.
*/
declare function isPreflightRequest(event: HTTPEvent): boolean;
/**
* Append CORS preflight headers to the response.
*/
declare function appendCorsPreflightHeaders(event: H3Event, options: CorsOptions): void;
/**
* Append CORS headers to the response.
*/
declare function appendCorsHeaders(event: H3Event, options: CorsOptions): void;
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
declare function handleCors(event: H3Event, options: CorsOptions): false | Response;
//#endregion
//#region src/utils/auth.d.ts
type _BasicAuthOptions = {
  /**
  * Validate username for basic auth.
  */
  username: string;
  /***
  * Simple password for basic auth.
  */
  password: string;
  /**
  * Custom validation function for basic auth.
  */
  validate: (username: string, password: string) => boolean | Promise<boolean>;
  /**
  * Realm for the basic auth challenge.
  *
  * Defaults to "auth".
  */
  realm: string;
};
type BasicAuthOptions = Partial<_BasicAuthOptions> & ({
  validate: _BasicAuthOptions["validate"];
} | {
  password: _BasicAuthOptions["password"];
});
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
declare function requireBasicAuth(event: HTTPEvent, opts: BasicAuthOptions): Promise<true>;
/**
* Create a basic authentication middleware.
*
* @example
* import { H3, serve, basicAuth } from "h3";
* const auth = basicAuth({ password: "test" });
* app.get("/", (event) => `Hello ${event.context.basicAuth?.username}!`, [auth]);
* serve(app, { port: 3000 });
*/
declare function basicAuth(opts: BasicAuthOptions): Middleware;
//#endregion
//#region src/utils/fingerprint.d.ts
interface RequestFingerprintOptions {
  /** @default SHA-1 */
  hash?: false | "SHA-1";
  /** @default `true` */
  ip?: boolean;
  /** @default `false` */
  xForwardedFor?: boolean;
  /** @default `false` */
  method?: boolean;
  /** @default `false` */
  url?: boolean;
  /** @default `false` */
  userAgent?: boolean;
}
/**
*
* Get a unique fingerprint for the incoming request.
*
* @experimental Behavior of this utility might change in the future versions
*/
declare function getRequestFingerprint(event: HTTPEvent, opts?: RequestFingerprintOptions): Promise<string | null>;
//#endregion
//#region src/utils/ws.d.ts
/**
* Define WebSocket hooks.
*
* @see https://h3.dev/guide/websocket
*/
declare function defineWebSocket(hooks: Partial<Hooks>): Partial<Hooks>;
/**
* Define WebSocket event handler.
*
* @see https://h3.dev/guide/websocket
*/
declare function defineWebSocketHandler(hooks: Partial<Hooks>): EventHandler;
//#endregion
//#region src/_deprecated.d.ts
// --- Error ---
/** @deprecated Use `HTTPError` */
type H3Error = HTTPError;
/** @deprecated Use `HTTPError` */
declare const H3Error: typeof HTTPError;
/** @deprecated Use new HTTPError() */
declare function createError(message: number, details?: ErrorDetails): HTTPError;
declare function createError(details: ErrorDetails): HTTPError;
/**
* @deprecated Use `HTTPError.isError`
*/
declare function isError(input: any): input is HTTPError;
// --- Request ---
/** @deprecated Please use `event.url` */
declare const getRequestPath: (event: H3Event) => string;
/** @deprecated Please use `event.req.headers.get(name)` */
declare function getRequestHeader(event: H3Event, name: string): string | undefined;
/** @deprecated Please use `event.req.headers.get(name)` */
declare const getHeader: (event: H3Event, name: string) => string | undefined;
/** @deprecated Please use `Object.fromEntries(event.req.headers.entries())` */
declare function getRequestHeaders(event: H3Event): Record<string, string>;
/** @deprecated Please use `Object.fromEntries(event.req.headers.entries())` */
declare const getHeaders: (event: H3Event) => Record<string, string>;
/** @deprecated Please use `event.req.method` */
declare function getMethod(event: H3Event, defaultMethod?: string): string;
// --- Request Body ---
/** @deprecated Please use `event.req.text()` or `event.req.arrayBuffer()` */
declare function readRawBody<E extends "utf8" | false = "utf8">(event: H3Event, encoding?: E): E extends false ? Promise<Uint8Array | undefined> : Promise<string | undefined>;
/** @deprecated Please use `event.req.formData()` */
declare function readFormDataBody(event: H3Event): Promise<FormData>;
/** @deprecated Please use `event.req.formData()` */
declare const readFormData: (event: H3Event) => Promise<FormData>;
/** @deprecated Please use `event.req.formData()` */
declare function readMultipartFormData(event: H3Event): Promise<Array<{
  data: Uint8Array;
  name?: string;
  filename?: string;
  type?: string;
}>>;
/** @deprecated Please use `event.req.body` */
declare function getBodyStream(event: H3Event): ReadableStream<Uint8Array> | undefined;
/** @deprecated Please use `event.req.body` */
declare const getRequestWebStream: (event: H3Event) => ReadableStream | undefined;
// --- Response ---
/** @deprecated Please directly return stream */
declare function sendStream(_event: H3Event, value: ReadableStream): ReadableStream;
/** @deprecated Please use `return noContent(event)` */
declare const sendNoContent: (event: H3Event, code?: number) => Response;
/** @deprecated Please use `return redirect(event, code)` */
declare const sendRedirect: (event: H3Event, location: string, code: number) => string;
/** @deprecated Please directly return response */
declare const sendWebResponse: (response: Response) => Response;
/** @deprecated Please use `return proxy(event)` */
declare const sendProxy: (event: H3Event, target: string, opts?: ProxyOptions) => Promise<BodyInit | undefined | null>;
/** @deprecated Please use `return iterable(event, value)` */
declare const sendIterable: <Value = unknown, Return = unknown>(_event: H3Event, iterable: IterationSource<Value, Return>, options?: {
  serializer: IteratorSerializer<Value | Return>;
}) => ReadableStream;
/** @deprecated Please use `event.res.statusText` */
declare function getResponseStatusText(event: H3Event): string;
/** @deprecated Please use `event.res.headers.append(name, value)` */
declare function appendResponseHeader(event: H3Event, name: string, value: string | string[]): void;
/** @deprecated Please use `event.res.headers.append(name, value)` */
declare const appendHeader: (event: H3Event, name: string, value: string | string[]) => void;
/** @deprecated Please use `event.res.headers.set(name, value)` */
declare function setResponseHeader(event: H3Event, name: string, value: string | string[]): void;
/** @deprecated Please use `event.res.headers.set(name, value)` */
declare const setHeader: (event: H3Event, name: string, value: string | string[]) => void;
/** @deprecated Please use `event.res.headers.set(name, value)` */
declare function setResponseHeaders(event: H3Event, headers: Record<string, string>): void;
/** @deprecated Please use `event.res.headers.set(name, value)` */
declare const setHeaders: (event: H3Event, headers: Record<string, string>) => void;
/** @deprecated Please use `event.res.status` */
declare function getResponseStatus(event: H3Event): number;
/** @deprecated Please directly set `event.res.status` and `event.res.statusText` */
declare function setResponseStatus(event: H3Event, code?: number, text?: string): void;
/** @deprecated Please use `event.res.headers.set("content-type", type)` */
declare function defaultContentType(event: H3Event, type?: string): void;
/** @deprecated Please use `Object.fromEntries(event.res.headers.entries())` */
declare function getResponseHeaders(event: H3Event): Record<string, string>;
/** @deprecated Please use `event.res.headers.get(name)` */
declare function getResponseHeader(event: H3Event, name: string): string | undefined;
/** @deprecated Please use `event.res.headers.delete(name)` instead. */
declare function removeResponseHeader(event: H3Event, name: string): void;
/** @deprecated Please use `event.res.headers.append(name, value)` */
declare function appendResponseHeaders(event: H3Event, headers: string): void;
/** @deprecated Please use `event.res.headers.append(name, value)` */
declare const appendHeaders: (event: H3Event, headers: string) => void;
/** @deprecated Please use `event.res.headers.delete` */
declare function clearResponseHeaders(event: H3Event, headerNames?: string[]): void;
// -- Event handler --
/** Please use `defineHandler`  */
declare const defineEventHandler: (handler: EventHandler) => EventHandler;
/** Please use `defineHandler`  */
declare const eventHandler: (handler: EventHandler) => EventHandler;
/** Please use `defineLazyEventHandler` */
declare const lazyEventHandler: (load: () => Promise<EventHandler> | EventHandler) => EventHandler;
/** @deprecated Please use `defineNodeHandler` */
declare const defineNodeListener: (handler: NodeHandler) => NodeHandler;
/** @deprecated Please use `defineNodeHandler` */
declare const fromNodeMiddleware: (handler: NodeHandler | NodeMiddleware) => EventHandler;
/** @deprecated Please use `toNodeHandler` */
declare const toNodeListener: (app: H3) => NodeHandler;
/** @deprecated */
declare function toEventHandler(input: any, _?: any, _route?: string): EventHandler;
// -- App/Router --
/** @deprecated Please use `new H3()` */
declare const createApp: (config?: H3Config) => H3;
/** @deprecated Please use `new H3()` */
declare const createRouter$1: (config?: H3Config) => H3;
/** @deprecated Please use `withBase()` */
declare const useBase: (base: string, input: EventHandler | H3) => EventHandler;
//#endregion
export { BasicAuthOptions, CacheConditions, CorsOptions, DynamicEventHandler, ErrorBody, ErrorDetails, ErrorInput, EventHandler, EventHandlerObject, EventHandlerRequest, EventHandlerResponse, EventStreamMessage, EventStreamOptions, FetchHandler, H3 as H3$1, H3Config, H3Core as H3Core$1, H3Error as H3Error$1, H3Event as H3Event$1, H3EventContext, H3Plugin, H3Route, H3RouteMeta, HTTPError as HTTPError$1, HTTPEvent, HTTPMethod, InferEventInput, LazyEventHandler, Middleware, MiddlewareOptions, NodeHandler, NodeMiddleware, PreparedResponse, ProxyOptions, RequestFingerprintOptions, RouteDefinition, RouteOptions, ServeStaticOptions, Session, SessionConfig, SessionData, StaticAssetMeta, appendCorsHeaders as appendCorsHeaders$1, appendCorsPreflightHeaders as appendCorsPreflightHeaders$1, appendHeader as appendHeader$1, appendHeaders as appendHeaders$1, appendResponseHeader as appendResponseHeader$1, appendResponseHeaders as appendResponseHeaders$1, assertMethod as assertMethod$1, basicAuth as basicAuth$1, clearResponseHeaders as clearResponseHeaders$1, clearSession as clearSession$1, createApp as createApp$1, createError as createError$1, createEventStream as createEventStream$1, createRouter$1, defaultContentType as defaultContentType$1, defineEventHandler as defineEventHandler$1, defineHandler as defineHandler$1, defineLazyEventHandler as defineLazyEventHandler$1, defineMiddleware as defineMiddleware$1, defineNodeHandler as defineNodeHandler$1, defineNodeListener as defineNodeListener$1, defineNodeMiddleware as defineNodeMiddleware$1, definePlugin as definePlugin$1, defineRoute as defineRoute$1, defineValidatedHandler as defineValidatedHandler$1, defineWebSocket as defineWebSocket$1, defineWebSocketHandler as defineWebSocketHandler$1, deleteCookie as deleteCookie$1, dynamicEventHandler as dynamicEventHandler$1, eventHandler as eventHandler$1, fetchWithEvent as fetchWithEvent$1, fromNodeHandler as fromNodeHandler$1, fromNodeMiddleware as fromNodeMiddleware$1, fromWebHandler as fromWebHandler$1, getBodyStream as getBodyStream$1, getCookie as getCookie$1, getEventContext as getEventContext$1, getHeader as getHeader$1, getHeaders as getHeaders$1, getMethod as getMethod$1, getProxyRequestHeaders as getProxyRequestHeaders$1, getQuery as getQuery$1, getRequestFingerprint as getRequestFingerprint$1, getRequestHeader as getRequestHeader$1, getRequestHeaders as getRequestHeaders$1, getRequestHost as getRequestHost$1, getRequestIP as getRequestIP$1, getRequestPath as getRequestPath$1, getRequestProtocol as getRequestProtocol$1, getRequestURL as getRequestURL$1, getRequestWebStream as getRequestWebStream$1, getResponseHeader as getResponseHeader$1, getResponseHeaders as getResponseHeaders$1, getResponseStatus as getResponseStatus$1, getResponseStatusText as getResponseStatusText$1, getRouterParam as getRouterParam$1, getRouterParams as getRouterParams$1, getSession as getSession$1, getValidatedQuery as getValidatedQuery$1, getValidatedRouterParams as getValidatedRouterParams$1, handleCacheHeaders as handleCacheHeaders$1, handleCors as handleCors$1, html as html$1, isCorsOriginAllowed as isCorsOriginAllowed$1, isError as isError$1, isEvent as isEvent$1, isHTTPEvent as isHTTPEvent$1, isMethod as isMethod$1, isPreflightRequest as isPreflightRequest$1, iterable as iterable$1, lazyEventHandler as lazyEventHandler$1, mockEvent as mockEvent$1, noContent as noContent$1, onError as onError$1, onRequest as onRequest$1, onResponse as onResponse$1, parseCookies as parseCookies$1, proxy as proxy$1, proxyRequest as proxyRequest$1, readBody as readBody$1, readFormData as readFormData$1, readFormDataBody as readFormDataBody$1, readMultipartFormData as readMultipartFormData$1, readRawBody as readRawBody$1, readValidatedBody as readValidatedBody$1, redirect as redirect$1, removeResponseHeader as removeResponseHeader$1, requireBasicAuth as requireBasicAuth$1, sanitizeStatusCode as sanitizeStatusCode$1, sanitizeStatusMessage as sanitizeStatusMessage$1, sealSession as sealSession$1, sendIterable as sendIterable$1, sendNoContent as sendNoContent$1, sendProxy as sendProxy$1, sendRedirect as sendRedirect$1, sendStream as sendStream$1, sendWebResponse as sendWebResponse$1, serveStatic as serveStatic$1, setCookie as setCookie$1, setHeader as setHeader$1, setHeaders as setHeaders$1, setResponseHeader as setResponseHeader$1, setResponseHeaders as setResponseHeaders$1, setResponseStatus as setResponseStatus$1, toEventHandler as toEventHandler$1, toNodeHandler as toNodeHandler$1, toNodeListener as toNodeListener$1, toRequest as toRequest$1, toResponse as toResponse$1, toWebHandler as toWebHandler$1, unsealSession as unsealSession$1, updateSession as updateSession$1, useBase as useBase$1, useSession as useSession$1, withBase as withBase$1, writeEarlyHints as writeEarlyHints$1 };