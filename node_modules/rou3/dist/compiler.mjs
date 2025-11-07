//#region src/compiler.ts
/**
* Compiles the router instance into a faster route-matching function.
*
* **IMPORTANT:** `compileRouter` requires eval support with `new Function()` in the runtime for JIT compilation.
*
* @example
* import { createRouter, addRoute } from "rou3";
* import { compileRouter } from "rou3/compiler";
* const router = createRouter();
* // [add some routes]
* const findRoute = compileRouter(router);
* const matchAll = compileRouter(router, { matchAll: true });
* findRoute("GET", "/path/foo/bar");
*
* @param router - The router context to compile.
*/
function compileRouter(router, opts) {
	const ctx = {
		opts: opts || {},
		router,
		deps: []
	};
	const compiled = compileRouteMatch(ctx);
	return new Function(...ctx.deps.map((_, i) => "d" + (i + 1)), `return(m,p)=>{${compiled}}`)(...ctx.deps);
}
/**
* Compile the router instance into a compact runnable code.
*
* **IMPORTANT:** Route data must be serializable to JSON (i.e., no functions or classes) or implement the `toJSON()` method to render custom code or you can pass custom `serialize` function in options.
*
* @example
* import { createRouter, addRoute } from "rou3";
* import { compileRouterToString } from "rou3/compiler";
* const router = createRouter();
* // [add some routes with serializable data]
* const compilerCode = compileRouterToString(router, "findRoute");
* // "const findRoute=(m, p) => {}"
*/
function compileRouterToString(router, functionName, opts) {
	const ctx = {
		opts: opts || {},
		router,
		deps: void 0
	};
	const compiled = `(m,p)=>{${compileRouteMatch(ctx)}}`;
	return functionName ? `const ${functionName}=${compiled};` : compiled;
}
function compileRouteMatch(ctx) {
	let code = "";
	const staticNodes = new Set();
	for (const key in ctx.router.static) {
		const node = ctx.router.static[key];
		if (node?.methods) {
			staticNodes.add(node);
			code += `if(p===${JSON.stringify(key.replace(/\/$/, "") || "/")}){${compileMethodMatch(ctx, node.methods, [], -1)}}`;
		}
	}
	const match = compileNode(ctx, ctx.router.root, [], 0, staticNodes);
	if (match) code += `let s=p.split("/"),l=s.length-1;${match}`;
	if (!code) return ctx.opts?.matchAll ? `return [];` : "";
	return `${ctx.opts?.matchAll ? `let r=[];` : ""}if(p.charCodeAt(p.length-1)===47)p=p.slice(0,-1)||"/";${code}${ctx.opts?.matchAll ? "return r;" : ""}`;
}
function compileMethodMatch(ctx, methods, params, currentIdx) {
	let code = "";
	for (const key in methods) {
		const matchers = methods[key];
		if (matchers && matchers?.length > 0) {
			if (key !== "") code += `if(m==="${key}")${matchers.length > 1 ? "{" : ""}`;
			const _matchers = matchers.map((m) => compileFinalMatch(ctx, m, currentIdx, params)).sort((a, b) => b.weight - a.weight);
			for (const matcher of _matchers) code += matcher.code;
			if (key !== "") code += matchers.length > 1 ? "}" : "";
		}
	}
	return code;
}
function compileFinalMatch(ctx, data, currentIdx, params) {
	let ret = `{data:${serializeData(ctx, data.data)}`;
	const conditions = [];
	const { paramsMap, paramsRegexp } = data;
	if (paramsMap && paramsMap.length > 0) {
		const required = !paramsMap[paramsMap.length - 1][2] && currentIdx !== -1;
		if (required) conditions.push(`l>=${currentIdx}`);
		for (let i = 0; i < paramsRegexp.length; i++) {
			const regexp = paramsRegexp[i];
			if (!regexp) continue;
			conditions.push(`${regexp.toString()}.test(s[${i + 1}])`);
		}
		ret += ",params:{";
		for (let i = 0; i < paramsMap.length; i++) {
			const map = paramsMap[i];
			ret += typeof map[1] === "string" ? `${JSON.stringify(map[1])}:${params[i]},` : `...(${map[1].toString()}.exec(${params[i]}))?.groups,`;
		}
		ret += "}";
	}
	const code = (conditions.length > 0 ? `if(${conditions.join("&&")})` : "") + (ctx.opts?.matchAll ? `r.unshift(${ret}});` : `return ${ret}};`);
	return {
		code,
		weight: conditions.length
	};
}
function compileNode(ctx, node, params, startIdx, staticNodes) {
	let code = "";
	if (node.methods && !staticNodes.has(node)) {
		const match = compileMethodMatch(ctx, node.methods, params, node.key === "*" ? startIdx : -1);
		if (match) {
			const hasLastOptionalParam = node.key === "*";
			code += `if(l===${startIdx}${hasLastOptionalParam ? `||l===${startIdx - 1}` : ""}){${match}}`;
		}
	}
	if (node.static) for (const key in node.static) {
		const match = compileNode(ctx, node.static[key], params, startIdx + 1, staticNodes);
		if (match) code += `if(s[${startIdx + 1}]===${JSON.stringify(key)}){${match}}`;
	}
	if (node.param) {
		const match = compileNode(ctx, node.param, [...params, `s[${startIdx + 1}]`], startIdx + 1, staticNodes);
		if (match) code += match;
	}
	if (node.wildcard) {
		const { wildcard } = node;
		if (wildcard.static || wildcard.param || wildcard.wildcard) throw new Error("Compiler mode does not support patterns after wildcard");
		if (wildcard.methods) {
			const match = compileMethodMatch(ctx, wildcard.methods, [...params, `s.slice(${startIdx + 1}).join('/')`], startIdx);
			if (match) code += match;
		}
	}
	return code;
}
function serializeData(ctx, value) {
	if (ctx.deps) return `d${ctx.deps.push(value)}`;
	if (ctx.opts?.serialize) return ctx.opts.serialize(value);
	if (typeof value?.toJSON === "function") return value.toJSON();
	return JSON.stringify(value);
}

//#endregion
export { compileRouter, compileRouterToString };