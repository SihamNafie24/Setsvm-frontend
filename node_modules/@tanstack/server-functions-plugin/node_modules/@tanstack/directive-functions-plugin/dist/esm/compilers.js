import * as babel from "@babel/core";
import { isVariableDeclarator, isIdentifier } from "@babel/types";
import { codeFrameColumns } from "@babel/code-frame";
import { findReferencedIdentifiers, deadCodeElimination } from "babel-dead-code-elimination";
import path from "pathe";
import { parseAst, generateFromAst } from "@tanstack/router-utils";
function buildDirectiveSplitParam(opts) {
  return `tsr-directive-${opts.directive.replace(/[^a-zA-Z0-9]/g, "-")}`;
}
function compileDirectives(opts) {
  const directiveSplitParam = buildDirectiveSplitParam(opts);
  const isDirectiveSplitParam = opts.filename.includes(directiveSplitParam);
  const ast = parseAst(opts);
  const refIdents = findReferencedIdentifiers(ast);
  const directiveFnsById = findDirectives(ast, {
    ...opts,
    directiveSplitParam,
    isDirectiveSplitParam
  });
  if (Object.keys(directiveFnsById).length > 0) {
    if (opts.getRuntimeCode) {
      const runtimeImport = babel.template.statement(
        opts.getRuntimeCode({ directiveFnsById })
      )();
      ast.program.body.unshift(runtimeImport);
    }
  }
  if (isDirectiveSplitParam) {
    safeRemoveExports(ast);
    ast.program.body.push(
      babel.types.exportNamedDeclaration(
        void 0,
        Object.values(directiveFnsById).map(
          (fn) => babel.types.exportSpecifier(
            babel.types.identifier(fn.functionName),
            babel.types.identifier(fn.functionName)
          )
        )
      )
    );
  }
  deadCodeElimination(ast, refIdents);
  const compiledResult = generateFromAst(ast, {
    sourceMaps: true,
    sourceFileName: opts.filename,
    filename: opts.filename
  });
  return {
    compiledResult,
    directiveFnsById,
    isDirectiveSplitParam
  };
}
function findNearestVariableName(path2, directiveLabel) {
  let currentPath = path2;
  const nameParts = [];
  while (currentPath) {
    const name = (() => {
      if (babel.types.isFunctionExpression(currentPath.node) && currentPath.node.id) {
        return currentPath.node.id.name;
      }
      if (babel.types.isCallExpression(currentPath.node)) {
        const current = currentPath.node.callee;
        const chainParts = [];
        if (babel.types.isMemberExpression(current)) {
          if (babel.types.isIdentifier(current.property)) {
            chainParts.unshift(current.property.name);
          }
          let base = current.object;
          while (!babel.types.isIdentifier(base)) {
            if (babel.types.isCallExpression(base)) {
              base = base.callee;
            } else if (babel.types.isMemberExpression(base)) {
              base = base.object;
            } else {
              break;
            }
          }
          if (babel.types.isIdentifier(base)) {
            chainParts.unshift(base.name);
          }
        } else if (babel.types.isIdentifier(current)) {
          chainParts.unshift(current.name);
        }
        if (chainParts.length > 0) {
          return chainParts.join("_");
        }
      }
      if (babel.types.isFunctionDeclaration(currentPath.node)) {
        return currentPath.node.id?.name;
      }
      if (babel.types.isIdentifier(currentPath.node)) {
        return currentPath.node.name;
      }
      if (isVariableDeclarator(currentPath.node) && isIdentifier(currentPath.node.id)) {
        return currentPath.node.id.name;
      }
      if (babel.types.isClassMethod(currentPath.node) || babel.types.isObjectMethod(currentPath.node)) {
        throw new Error(
          `${directiveLabel} in ClassMethod or ObjectMethod not supported`
        );
      }
      return "";
    })();
    if (name) {
      nameParts.unshift(name);
    }
    currentPath = currentPath.parentPath;
  }
  return nameParts.length > 0 ? nameParts.join("_") : "anonymous";
}
function makeIdentifierSafe(identifier) {
  return identifier.replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^[0-9]/, "_$&").replace(/^\$/, "_$").replace(/_{2,}/g, "_").replace(/^_|_$/g, "");
}
function findDirectives(ast, opts) {
  const directiveFnsById = {};
  const functionNameSet = /* @__PURE__ */ new Set();
  let programPath;
  babel.traverse(ast, {
    Program(path2) {
      programPath = path2;
    }
  });
  const hasFileDirective = ast.program.directives.some(
    (directive) => directive.value.value === opts.directive
  );
  const compileDirectiveOpts = {
    isDirectiveSplitParam: opts.isDirectiveSplitParam
  };
  if (hasFileDirective) {
    babel.traverse(ast, {
      ExportDefaultDeclaration(path2) {
        if (babel.types.isFunctionDeclaration(path2.node.declaration)) {
          compileDirective(
            path2.get("declaration"),
            compileDirectiveOpts
          );
        }
      },
      ExportNamedDeclaration(path2) {
        if (babel.types.isFunctionDeclaration(path2.node.declaration)) {
          compileDirective(
            path2.get("declaration"),
            compileDirectiveOpts
          );
        }
      },
      ExportDeclaration(path2) {
        if (babel.types.isExportNamedDeclaration(path2.node) && babel.types.isVariableDeclaration(path2.node.declaration) && (babel.types.isFunctionExpression(
          path2.node.declaration.declarations[0]?.init
        ) || babel.types.isArrowFunctionExpression(
          path2.node.declaration.declarations[0]?.init
        ))) {
          compileDirective(
            path2.get(
              "declaration.declarations.0.init"
            ),
            compileDirectiveOpts
          );
        }
      }
    });
  } else {
    babel.traverse(ast, {
      DirectiveLiteral(nodePath) {
        if (nodePath.node.value === opts.directive) {
          const directiveFn = nodePath.findParent((p) => p.isFunction());
          if (!directiveFn) return;
          const isClassMethod = directiveFn.isClassMethod();
          const isObjectMethod = directiveFn.isObjectMethod();
          if (isClassMethod || isObjectMethod) {
            throw codeFrameError(
              opts.code,
              directiveFn.node.loc,
              `"${opts.directive}" in ${isClassMethod ? "class" : isObjectMethod ? "object method" : ""} not supported`
            );
          }
          const nearestBlock = directiveFn.findParent(
            (p) => (p.isBlockStatement() || p.isScopable()) && !p.isProgram()
          );
          if (nearestBlock) {
            throw codeFrameError(
              opts.code,
              nearestBlock.node.loc,
              `${opts.directiveLabel}s cannot be nested in other blocks or functions`
            );
          }
          if (!directiveFn.isFunctionDeclaration() && !directiveFn.isFunctionExpression() && !(directiveFn.isArrowFunctionExpression() && babel.types.isBlockStatement(directiveFn.node.body))) {
            throw codeFrameError(
              opts.code,
              directiveFn.node.loc,
              `${opts.directiveLabel}s must be function declarations or function expressions`
            );
          }
          compileDirective(directiveFn, compileDirectiveOpts);
        }
      }
    });
  }
  return directiveFnsById;
  function compileDirective(directiveFn, compileDirectiveOpts2) {
    const programBody = programPath.node.body;
    if (babel.types.isFunction(directiveFn.node) && babel.types.isBlockStatement(directiveFn.node.body)) {
      directiveFn.node.body.directives = directiveFn.node.body.directives.filter(
        (directive) => directive.value.value !== opts.directive
      );
    }
    if (directiveFn.parentPath.isProgram()) {
      if (!babel.types.isFunctionDeclaration(directiveFn.node)) {
        throw new Error("Top level functions must be function declarations");
      }
      const index = programBody.indexOf(directiveFn.node);
      const originalFunctionName = directiveFn.node.id.name;
      directiveFn.node.id = null;
      const variableDeclaration = babel.types.variableDeclaration("const", [
        babel.types.variableDeclarator(
          babel.types.identifier(originalFunctionName),
          babel.types.toExpression(directiveFn.node)
        )
      ]);
      directiveFn.replaceWith(variableDeclaration);
      directiveFn = programPath.get(
        `body.${index}.declarations.0.init`
      );
    }
    let functionName = findNearestVariableName(directiveFn, opts.directiveLabel);
    const incrementFunctionNameVersion = (functionName2) => {
      const [realReferenceName, count] = functionName2.split(/_(\d+)$/);
      const resolvedCount = Number(count || "0");
      const suffix = `_${resolvedCount + 1}`;
      return makeIdentifierSafe(realReferenceName) + suffix;
    };
    while (functionNameSet.has(functionName)) {
      functionName = incrementFunctionNameVersion(functionName);
    }
    functionNameSet.add(functionName);
    while (programPath.scope.hasBinding(functionName)) {
      functionName = incrementFunctionNameVersion(functionName);
      programPath.scope.crawl();
    }
    functionNameSet.add(functionName);
    const topParent = directiveFn.findParent((p) => !!p.parentPath?.isProgram()) || directiveFn;
    const topParentIndex = programBody.indexOf(topParent.node);
    if (directiveFn.parentPath.isProgram()) {
      throw new Error(
        "Top level functions should have already been compiled to variable declarations by this point"
      );
    }
    programBody.splice(
      topParentIndex,
      0,
      babel.types.variableDeclaration("const", [
        babel.types.variableDeclarator(
          babel.types.identifier(functionName),
          babel.types.toExpression(directiveFn.node)
        )
      ])
    );
    if ((babel.types.isExportNamedDeclaration(directiveFn.parentPath.node) || compileDirectiveOpts2.isDirectiveSplitParam && babel.types.isExportDefaultDeclaration(
      directiveFn.parentPath.node
    )) && (babel.types.isFunctionDeclaration(directiveFn.node) || babel.types.isFunctionExpression(directiveFn.node)) && babel.types.isIdentifier(directiveFn.node.id)) {
      const originalFunctionName = directiveFn.node.id.name;
      programBody.splice(
        topParentIndex + 1,
        0,
        babel.types.exportNamedDeclaration(
          babel.types.variableDeclaration("const", [
            babel.types.variableDeclarator(
              babel.types.identifier(originalFunctionName),
              babel.types.identifier(functionName)
            )
          ])
        )
      );
      directiveFn.remove();
    } else {
      directiveFn.replaceWith(babel.types.identifier(functionName));
    }
    directiveFn = programPath.get(
      `body.${topParentIndex}.declarations.0.init`
    );
    const [baseFilename, ..._searchParams] = opts.filename.split("?");
    const searchParams = new URLSearchParams(_searchParams.join("&"));
    searchParams.set(opts.directiveSplitParam, "");
    const extractedFilename = `${baseFilename}?${searchParams.toString()}`;
    const relativeFilename = path.relative(opts.root, baseFilename);
    const functionId = opts.generateFunctionId({
      filename: relativeFilename,
      functionName,
      extractedFilename
    });
    if (opts.replacer) {
      const replacer = opts.replacer({
        fn: "$$fn$$",
        extractedFilename,
        filename: opts.filename,
        functionId,
        isSourceFn: !!opts.directiveSplitParam
      });
      const replacement = babel.template.expression(replacer, {
        placeholderPattern: false,
        placeholderWhitelist: /* @__PURE__ */ new Set(["$$fn$$"])
      })({
        ...replacer.includes("$$fn$$") ? { $$fn$$: babel.types.toExpression(directiveFn.node) } : {}
      });
      directiveFn.replaceWith(replacement);
    }
    directiveFnsById[functionId] = {
      nodePath: directiveFn,
      functionName,
      functionId,
      extractedFilename,
      filename: opts.filename,
      chunkName: fileNameToChunkName(opts.root, extractedFilename)
    };
  }
}
function codeFrameError(code, loc, message) {
  if (!loc) {
    return new Error(`${message} at unknown location`);
  }
  const frame = codeFrameColumns(
    code,
    {
      start: loc.start,
      end: loc.end
    },
    {
      highlightCode: true,
      message
    }
  );
  return new Error(frame);
}
const safeRemoveExports = (ast) => {
  ast.program.body = ast.program.body.flatMap((node) => {
    if (babel.types.isExportNamedDeclaration(node) || babel.types.isExportDefaultDeclaration(node)) {
      if (babel.types.isFunctionDeclaration(node.declaration) || babel.types.isClassDeclaration(node.declaration) || babel.types.isVariableDeclaration(node.declaration)) {
        if (babel.types.isFunctionDeclaration(node.declaration) || babel.types.isClassDeclaration(node.declaration)) {
          if (!node.declaration.id) {
            return node;
          }
        }
        return node.declaration;
      } else if (node.declaration === null) {
        return [];
      }
    }
    return node;
  });
};
function fileNameToChunkName(root, fileName) {
  return fileName.replace(root, "").replace(/[^a-zA-Z0-9_]/g, "_");
}
export {
  compileDirectives,
  findDirectives
};
//# sourceMappingURL=compilers.js.map
