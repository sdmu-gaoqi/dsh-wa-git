window.__ModuleLoader__.load({
  id: "@wagq/dsh-git",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/ScmPanel.ts
var React9 = __toESM(require("react"), 1);

// src/client/api.ts
var ApiError = class extends Error {
  status;
  detail;
  constructor(message, status, detail = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
};
var PREFIX = "/wagq-git/api";
async function readJson(response) {
  const text = await response.text();
  let parsed;
  try {
    parsed = text === "" ? {} : JSON.parse(text);
  } catch {
    throw new ApiError(`\u54CD\u5E94\u4E0D\u662F JSON\uFF08HTTP ${response.status}\uFF09`, response.status, text.slice(0, 400));
  }
  const body = parsed ?? {};
  if (!response.ok || body.ok === false) {
    const message = typeof body.error === "string" ? body.error : `HTTP ${response.status}`;
    const detail = typeof body.detail === "string" ? body.detail : "";
    throw new ApiError(message, response.status, detail);
  }
  return parsed;
}
async function get(path, params) {
  const search = new URLSearchParams(params);
  const response = await fetch(`${PREFIX}/${path}?${search.toString()}`, {
    headers: { accept: "application/json" },
    credentials: "same-origin"
  });
  return readJson(response);
}
async function post(path, body) {
  const response = await fetch(`${PREFIX}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body)
  });
  return readJson(response);
}
var api = {
  sessions() {
    return get("sessions", {});
  },
  state(cwd, limit = 80) {
    return get("state", { cwd, limit: String(limit) });
  },
  diff(cwd, path, staged, from) {
    return get("diff", { cwd, path, staged: staged ? "1" : "0", from });
  },
  message(cwd) {
    return get("message", { cwd });
  },
  branches(cwd) {
    return get("branches", { cwd });
  },
  remotes(cwd) {
    return get("remotes", { cwd });
  },
  commitDetail(cwd, sha) {
    return get("commit", { cwd, sha });
  },
  compare(cwd, limit = 40) {
    return get("compare", { cwd, limit: String(limit) });
  },
  generateMessage(cwd, sessionId) {
    return post("generate-message", { cwd, sessionId });
  },
  conflicts(cwd, paths) {
    return get("conflicts", { cwd, paths: paths.join("\0") });
  },
  resolveConflict(cwd, paths, side) {
    return post("resolve-conflict", { cwd, paths, side });
  },
  files(cwd, dir) {
    return get("files", { cwd, dir });
  },
  fileContent(cwd, path) {
    return get("file-content", { cwd, path });
  },
  writeFile(cwd, path, text) {
    return post("write-file", { cwd, path, text });
  },
  commitFile(cwd, sha, path) {
    return get("commit-file", { cwd, sha, path });
  },
  fileHistory(cwd, path) {
    return get("file-history", { cwd, path });
  },
  openPath(cwd, target, reveal = false) {
    return post("open-path", { cwd, target, reveal });
  },
  stage(cwd, paths) {
    return post("stage", { cwd, paths });
  },
  unstage(cwd, paths) {
    return post("unstage", { cwd, paths });
  },
  discard(cwd, paths) {
    return post("discard", { cwd, paths });
  },
  commit(cwd, message, amend, signoff = false) {
    return post("commit", { cwd, message, amend, signoff });
  },
  sync(cwd, action, options = {}) {
    return post("sync", { cwd, action, ...options });
  },
  checkout(cwd, target, create = false) {
    return post("checkout", { cwd, target, create });
  },
  deleteBranch(cwd, name2, force = false) {
    return post("branch-delete", { cwd, name: name2, force });
  },
  addRemote(cwd, name2, url) {
    return post("remote-add", { cwd, name: name2, url });
  },
  removeRemote(cwd, name2) {
    return post("remote-remove", { cwd, name: name2 });
  },
  setRemoteUrl(cwd, name2, url) {
    return post("remote-url", { cwd, name: name2, url });
  },
  commitAction(cwd, sha, action) {
    return post("commit-action", { cwd, sha, action });
  },
  terminal(cwd, command) {
    return post("terminal", { cwd, command });
  }
};

// src/client/icons.ts
var ICONS = {
  git: "M15.7 7.3 8.7.3a1 1 0 0 0-1.4 0L5.6 2 7 3.4a1.2 1.2 0 0 1 1.5 1.5l1.4 1.4a1.2 1.2 0 0 1 1.2 2 1.2 1.2 0 0 1-1.6-.1 1.2 1.2 0 0 1-.3-1.2L7.8 5.6v4.2a1.2 1.2 0 1 1-1.6 1.1 1.2 1.2 0 0 1 .4-.9V5.5a1.2 1.2 0 0 1-.7-1.6L4.6 2.4.3 6.7a1 1 0 0 0 0 1.4l7 7a1 1 0 0 0 1.4 0l7-7a1 1 0 0 0 0-1.4Z",
  commit: "M11 8a3 3 0 1 0-2.9-3.7H2v1.4h6.1A3 3 0 0 0 11 8Zm0-4.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM14 10.3H7.9a3 3 0 1 0 0 1.4H14v-1.4ZM5 12.9a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z",
  refresh: "M8 2.2a5.8 5.8 0 0 1 4.8 2.5v-2h1.5v4.8H9.5V5.9h2a4.3 4.3 0 1 0 1.1 4.4l1.4.5A5.8 5.8 0 1 1 8 2.2Z",
  close: "M3.7 2.6 2.6 3.7 6.9 8l-4.3 4.3 1.1 1.1L8 9.1l4.3 4.3 1.1-1.1L9.1 8l4.3-4.3-1.1-1.1L8 6.9Z",
  // Bold filled chevron: a 2.4px-thick V, readable down to 12px.
  chevron: "M8 11.6 1.7 5.3l1.6-1.6L8 8.4l4.7-4.7 1.6 1.6Z",
  plus: "M7.2 2.9h1.6v4.3h4.3v1.6H8.8v4.3H7.2V8.8H2.9V7.2h4.3Z",
  minus: "M2.6 7.2h10.8v1.6H2.6Z",
  // Curved "undo" arrow with a solid triangular head, not a thin hairline.
  undo: "M7.6 3.1 2.4 8.2l5.2 5.1 1.4-1.4-3-3h3.7a3.7 3.7 0 0 1 0 7.4H6.1v1.6h3.6a5.3 5.3 0 0 0 0-10.6H5.9l3.1-3.1Z",
  discard: "M6.4 2h3.2v1.3H13v1.3h-1.3v8a1 1 0 0 1-1 1H5.3a1 1 0 0 1-1-1v-8H3V3.3h3.4Zm.8 3.3v6.3h4.1V5.3Z",
  branch: "M9 2.7a1.9 1.9 0 1 1-2.6 1.8c0-.4.1-.7.3-1A2.6 2.6 0 0 0 5.5 5.6v4.9a1.9 1.9 0 1 1-1.3 0V4.3a3.9 3.9 0 0 1 3.9-3.9c.3 0 .6 0 .9.1Zm3.9 9.7a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Zm0-3.8V8a2.6 2.6 0 0 1-2.6 2.6H8.4V9.3h1.9A1.3 1.3 0 0 0 11.6 8V6.9h1.3Z",
  check: "M13.7 3.4 6.3 11.4 2.3 7.4l1.4-1.4 2.6 2.6 6-6Z",
  dot: "M8 5.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z",
  file: "M9.3 1.3H4a1 1 0 0 0-1 1v11.4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.3Zm-.6 1.5 2.2 2.2H8.7ZM4.3 13.4V2.7h3v3h2.9v7.7Z",
  folder: "M1.5 3.6h4.2l1.5 1.7h7.3a1 1 0 0 1 1 1v7.1a1 1 0 0 1-1 1H1.5Zm1.5 3.2v6h10V6.3H6.5L5 4.6H3Z",
  warning: "M8 1.4 15.2 14H.8ZM8 5.2 3.5 12.7h9ZM7.2 7.3h1.6v3.3H7.2Zm0 4.3h1.6v1.6H7.2Z",
  terminal: "M2.7 2.7h10.6a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3H2.7A1.3 1.3 0 0 1 1.4 12V4a1.3 1.3 0 0 1 1.3-1.3Zm0 1.3v8h10.6V4Zm1.6 1.7 3 2-3 2-.9-1.3 1.4-.7-.6-.4Zm3.6 3.7h3.4v1.3H7.9Z",
  dots: "M3.4 6.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm4.6 0a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm4.6 0a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z",
  sync: "M8 2.2a5.8 5.8 0 0 1 4.8 2.5v-2h1.5v4.8H9.5V5.9h2a4.3 4.3 0 1 0 1.1 4.4l1.4.5A5.8 5.8 0 1 1 8 2.2Z",
  // Down/up arrows with 3.4px-wide shafts and solid heads.
  download: "M7 1.4h2v7.3l2.6-2.6 1.4 1.4L8 12.5 3 7.5l1.4-1.4L7 8.7Zm-4.6 12.3h11.2v1.6H2.4Z",
  upload: "M7 13.8h2V6.5l2.6 2.6 1.4-1.4L8 2.8 3 7.8l1.4 1.4L7 6.5Zm-4.6-11h11.2V1.2H2.4Z",
  history: "M8 2.4a5.6 5.6 0 1 1-5.5 6.7H.8A6.9 6.9 0 1 0 2.9 3.4V1.5H1.4v3.9h3.9V3.9H3.6A5.6 5.6 0 0 1 8 2.4Zm-.8 2.7v3.3l2.6 1.5.8-1.3-1.9-1.1V5.1Z",
  repo: "M2.7 2.7h8.6a1.3 1.3 0 0 1 1.3 1.3v8.7h-1.3V5.3H2.7Zm0 0v10h1.3V4H4v8.7H2.7Zm2.6 1.3a1 1 0 0 1 1-1h1.4a1 1 0 0 1 0 2H6.3a1 1 0 0 1-1-1Z",
  spark: "M8 1.2 9.4 5l3.8 1.4L9.4 7.8 8 11.6 6.6 7.8 2.8 6.4 6.6 5Zm4.6 8.2.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Zm-9.2.6.5 1.4 1.4.6-1.4.6-.5 1.4-.6-1.4-1.4-.6 1.4-.6Z",
  maximize: "M2 2h4.6v1.5H3.5v3H2Zm7.4 0H14v4.5h-1.5v-3H9.4ZM2 9.4h1.5v3h3V14H2Zm10.5 0H14V14H9.4v-1.5h3Z",
  edit: "M11.9 1.7a1.8 1.8 0 0 1 2.6 2.6l-8 8L3 14l1.7-3.5Zm1.6 1.1L11 5.3l1.9 1.9 2.5-2.5a.9.9 0 0 0-1.3-1.3ZM9.8 6.5 4.6 11.7 4 13l1.3-.6 5.2-5.2Z"
};

// src/client/styles.ts
var SURFACE_LAYER = "var(--dsw-alias-bg-layer-1)";
var MENU_LAYER = "var(--dsw-alias-bg-layer-2)";
function surfaceRule(layer) {
  const tint = `linear-gradient(${layer},${layer})`;
  return `background-color:var(--dsw-alias-bg-base);background-image:${tint},${tint},${tint}`;
}
var SURFACE_CSS = surfaceRule(SURFACE_LAYER);
var MENU_CSS = surfaceRule(MENU_LAYER);
var CSS = `
/**
 * Every floating surface carries the same opaque recipe (see surfaceRule above):
 * menus and the confirm box render as SIBLINGS of .dshg-root (they must escape
 * its overflow:hidden), so each one paints its own background rather than
 * inheriting a variable from the dialog.
 */


.dshg-trigger{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1}
.dshg-trigger svg{width:15px;height:15px}
.dshg-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-trigger-on{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary)}
.dshg-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
/**
 * Two entries exist in the DOM at once: the root-scoped global one (always) and
 * the session-scoped one (only while a conversation is open). Show exactly one:
 * once a session button is mounted, suppress the global fallback. :has() on the
 * root element keeps the rule working from either button's stylesheet position.
 */
html:has(.dshg-trigger-session) .dshg-trigger-global{display:none}

/**
 * The shell is a column: header / banner / tabs / commit box / body / footer.
 * isolation:isolate keeps the page behind from compositing through, and the
 * background is the flattened surface token rather than a raw alias layer.
 */
[data-dsh-plugin="wagq-dsh-git"] svg:not([width]){width:14px;height:14px;flex:none}
.dshg-root{font:inherit;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;${SURFACE_CSS};isolation:isolate;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 18px 48px -12px rgba(0,0,0,.42),0 4px 14px -6px rgba(0,0,0,.28);overflow:hidden;height:auto;max-height:min(78vh,700px);min-height:0}
/**
 * With a side panel open the shell needs a FIXED height: the two columns only
 * split correctly against a resolved height, and the list must scroll instead of
 * stretching the dialog. Empty/short states still auto-size without the panel.
 */
.dshg-root[data-side=true]{height:min(74vh,660px)}

/* ---- header ---- */
.dshg-head{flex:none;display:flex;align-items:center;gap:8px;padding:9px 8px 8px 12px;${SURFACE_CSS};border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;line-height:18px;white-space:nowrap;flex:none}
.dshg-title svg{width:14px;height:14px;color:var(--dsw-alias-label-secondary)}
.dshg-repo{min-width:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
.dshg-branch{display:inline-flex;align-items:center;gap:4px;flex:none;height:20px;padding:0 7px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-branch svg{width:11px;height:11px;flex:none}
.dshg-branch-btn{cursor:pointer;font:inherit;font-size:11px;padding:0 8px;height:22px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-border-l2)}
.dshg-branch-btn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-state-business-primary)}
.dshg-branch-tag{margin-left:2px;padding:0 4px;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 24%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:9px}
.dshg-ahead{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex:none;height:22px;padding:0 7px;border:.5px solid transparent;border-radius:99px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;font-variant-numeric:tabular-nums;cursor:pointer;line-height:1}
.dshg-ahead:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}
.dshg-ahead-on{background:var(--dsw-alias-interactive-bg-active);border-color:var(--dsw-alias-state-business-primary)}
.dshg-ahead-up{color:var(--dsw-alias-state-success-primary)}
.dshg-ahead-down{color:var(--dsw-alias-state-warn-primary)}
.dshg-ahead-even{color:var(--dsw-alias-label-quaternary);letter-spacing:.06em}
.dshg-spacer{flex:1;min-width:4px}
.dshg-iconbtn{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1}
.dshg-iconbtn svg{width:15px;height:15px}
.dshg-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dshg-iconbtn[disabled]{opacity:.45;cursor:default;background:transparent}
.dshg-iconbtn.dshg-spinning svg{animation:dshg-spin .8s linear infinite}
@keyframes dshg-spin{to{transform:rotate(360deg)}}

/* ---- commit box ---- */
.dshg-commit{flex:none;padding:10px 12px 9px;display:flex;flex-direction:column;gap:8px;${SURFACE_CSS};border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-msg{box-sizing:border-box;width:100%;height:54px;min-height:42px;max-height:132px;resize:vertical;font:inherit;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 9px;outline:none}
.dshg-msg::placeholder{color:var(--dsw-alias-label-quaternary)}
.dshg-msg:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshg-commitrow{display:flex;align-items:stretch;border-radius:7px;overflow:hidden;background:var(--dsw-alias-state-business-primary)}
.dshg-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border:0;border-radius:0;font:inherit;font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary-inverted);background:transparent;cursor:pointer;white-space:nowrap;flex:1;min-width:0}
.dshg-primary:hover{background:rgba(255,255,255,.1)}
.dshg-primary[disabled]{opacity:.5;cursor:default;background:transparent}
.dshg-primary svg{width:13px;height:13px}
.dshg-split-arrow{flex:none;width:28px;border:0;border-left:.5px solid rgba(0,0,0,.28);display:inline-flex;align-items:center;justify-content:center;background:transparent;color:var(--dsw-alias-label-primary-inverted);cursor:pointer;padding:0;line-height:1}
.dshg-split-arrow svg{width:13px;height:13px}
.dshg-split-arrow:hover{background:rgba(255,255,255,.12)}
.dshg-split-arrow[disabled]{opacity:.5;cursor:default;background:transparent}
.dshg-subrow{display:flex;align-items:center;gap:8px;min-height:14px}
.dshg-check{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--dsw-alias-label-tertiary);cursor:pointer;user-select:none}
.dshg-check input{accent-color:var(--dsw-alias-state-business-primary);margin:0;width:12px;height:12px}
/* "Generate commit message" sits next to the amend toggle; it is a quiet action,
 * not a primary one, because committing is still the primary action. */
.dshg-genbtn{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:99px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap;line-height:1}
.dshg-genbtn svg{width:12px;height:12px;flex:none;color:var(--dsw-alias-state-business-primary)}
.dshg-genbtn:hover:not([disabled]){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}
.dshg-genbtn[disabled]{opacity:.45;cursor:default}

/* ---- section list ---- */
.dshg-body{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:row;overflow:hidden}
.dshg-root[data-side=true] .dshg-body{flex:1 1 auto;min-height:180px}
/* Direct children of .dshg-body are the columns; each must be able to scroll. */
.dshg-body > *{min-width:0;min-height:0}
.dshg-list{flex:1 1 auto;min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
/* Only constrain the list when a diff / detail panel actually shares the row. */
.dshg-root[data-side=true] .dshg-list{flex:0 0 clamp(200px,26%,300px)}
.dshg-list::-webkit-scrollbar{width:10px}
.dshg-list::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l1);border-radius:5px;border:2px solid transparent;background-clip:content-box}
.dshg-list::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l1);background-clip:content-box}
.dshg-section{display:flex;flex-direction:column}
.dshg-sechead{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:5px;padding:5px 8px 5px 4px;${SURFACE_CSS};border-bottom:.5px solid var(--dsw-alias-border-l3);cursor:pointer;user-select:none}
.dshg-sechead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-caret{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);transition:transform .12s ease}
.dshg-caret svg{width:12px;height:12px}
.dshg-caret[data-open=false]{transform:rotate(-90deg)}
.dshg-sectitle{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.dshg-count{min-width:16px;height:16px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;border-radius:99px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1;font-variant-numeric:tabular-nums}
.dshg-secactions{margin-left:auto;display:flex;align-items:center;gap:2px}
.dshg-mini{min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0 3px;line-height:1;font:inherit;font-size:10px}
.dshg-mini svg{width:13px;height:13px}
.dshg-mini:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-mini[disabled]{opacity:.4;cursor:default;background:transparent}
.dshg-viewtoggle{letter-spacing:.02em}

/* ---- file row (VS Code SCM row: name \u2026 [5, M] then hover actions) ---- */
.dshg-row{display:flex;align-items:center;gap:6px;min-height:24px;padding:0 8px 0 4px;cursor:pointer;background:transparent;border:0;width:100%;text-align:left;font:inherit;color:inherit}
.dshg-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-row[data-active=true]{background:var(--dsw-alias-interactive-bg-active)}
.dshg-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-rowname{min-width:0;flex:1 1 auto;font-size:12px;line-height:22px;padding-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.dshg-rowdir{color:var(--dsw-alias-label-quaternary)}
.dshg-rowdeco{flex:none;display:inline-flex;align-items:center;gap:6px;padding-right:2px}
.dshg-rowletter{flex:none;min-width:12px;text-align:right;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
.dshg-rowstat{flex:none;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-quaternary);display:inline-flex;gap:4px}
.dshg-add{color:var(--dsw-alias-state-success-primary)}
.dshg-del{color:var(--dsw-alias-state-error-primary)}
.dshg-rowbtns{flex:none;display:none;align-items:center;gap:1px}
.dshg-row:hover .dshg-rowbtns,.dshg-row[data-active=true] .dshg-rowbtns{display:inline-flex}
.dshg-row:hover .dshg-rowdeco,.dshg-row[data-active=true] .dshg-rowdeco{display:none}
.dshg-letter-M{color:var(--dsw-alias-state-warn-primary)}
.dshg-letter-A{color:var(--dsw-alias-state-success-primary)}
.dshg-letter-D{color:var(--dsw-alias-state-error-primary)}
.dshg-letter-R{color:var(--dsw-alias-state-business-primary)}
.dshg-letter-U{color:var(--dsw-alias-state-success-primary)}
.dshg-letter-C{color:var(--dsw-alias-label-tertiary)}
.dshg-letter-T{color:var(--dsw-alias-state-warn-primary)}

/* ---- graph ---- */
.dshg-grow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;height:26px;padding-right:8px;cursor:pointer;border:0;background:transparent;width:100%;text-align:left;font:inherit;color:inherit}
.dshg-grow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-grow:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-grow-head{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent)}
.dshg-grow-on{background:var(--dsw-alias-interactive-bg-active);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}
.dshg-gsvg{flex:none;display:block;overflow:visible}
.dshg-gmeta{min-width:0;display:flex;align-items:center;gap:6px}
.dshg-gsubject{min-width:0;font-size:12px;line-height:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-gref{flex:none;max-width:120px;height:16px;padding:0 5px;display:inline-flex;align-items:center;border-radius:4px;font-size:10px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent);color:var(--dsw-alias-state-business-primary);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 36%,transparent)}
.dshg-gref[data-kind=tag]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l3)}
.dshg-gref[data-kind=remote]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 34%,transparent)}
.dshg-gside{flex:none;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-quaternary);font-variant-numeric:tabular-nums}
.dshg-gsha{font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px}

/* ---- diff viewer (side panel) ----
 * The diff lives BESIDE the list, not under it: the popup widens and the body
 * becomes a two-column split, so the change list keeps its height and the diff
 * gets the full panel height instead of a sliver at the bottom.
 */
.dshg-list-graph{padding-bottom:4px}
.dshg-sechead.dshg-static{cursor:default;position:sticky;top:0;z-index:2}
.dshg-diff{flex:1 1 auto;min-width:0;border-left:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);display:flex;flex-direction:column;min-height:0;max-height:none}
.dshg-diffhead{flex:none;display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-diffhead svg{width:12px;height:12px;flex:none}
.dshg-diffpath{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.dshg-diffbody{flex:1;min-height:0;overflow:auto;font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55}
.dshg-difftable{border-collapse:collapse;width:100%;table-layout:fixed}
.dshg-hunk{background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-tertiary)}
.dshg-hunk td{padding:2px 8px;font-size:11px;word-break:break-all}
.dshg-num{width:36px;min-width:36px;padding:0 5px;text-align:right;color:var(--dsw-alias-label-quaternary);user-select:none;vertical-align:top;font-variant-numeric:tabular-nums}
.dshg-code{padding:0 8px 0 2px;white-space:pre-wrap;word-break:break-word;vertical-align:top}
.dshg-ln-add{background:var(--dsw-alias-file-diff-added-bg)}
.dshg-ln-del{background:var(--dsw-alias-file-diff-deleted-bg)}
.dshg-ln-add .dshg-num{background:var(--dsw-alias-file-diff-added-gutter)}
.dshg-ln-del .dshg-num{background:var(--dsw-alias-file-diff-deleted-gutter)}
.dshg-diffempty{padding:14px;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary);word-break:break-word}

/* ---- side-by-side diff (VS Code style) ----
 * Each side is EXACTLY half of the visible width. The grid must never size itself
 * to its longest line (that made one column run off the panel and forced a
 * horizontal scroll to read anything), so columns are minmax(0,1fr) with
 * overflow hidden and the code cells wrap inside their own half.
 */
.dshg-diffbody-split{overflow:auto;overflow-x:hidden}
.dshg-splitview{display:flex;flex-direction:column;width:100%;min-width:0}
.dshg-srow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);width:100%;min-width:0}
.dshg-scell{display:grid;grid-template-columns:34px 12px minmax(0,1fr);align-items:start;min-width:0;overflow:hidden;padding-right:4px}
.dshg-scell + .dshg-scell{border-left:.5px solid var(--dsw-alias-border-l3)}
.dshg-snum{padding:0 4px;text-align:right;color:var(--dsw-alias-label-quaternary);user-select:none;font-variant-numeric:tabular-nums;font-size:10.5px;overflow:hidden}
.dshg-smark{user-select:none;color:var(--dsw-alias-label-quaternary);text-align:center}
.dshg-scode{min-width:0;padding-right:2px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.dshg-scell.dshg-ln-add .dshg-snum{background:var(--dsw-alias-file-diff-added-gutter)}
.dshg-scell.dshg-ln-del .dshg-snum{background:var(--dsw-alias-file-diff-deleted-gutter)}
.dshg-scell.dshg-ln-add .dshg-smark{color:var(--dsw-alias-state-success-primary)}
.dshg-scell.dshg-ln-del .dshg-smark{color:var(--dsw-alias-state-error-primary)}
/* A cell with no counterpart on that side: hatched, so it reads as "nothing here". */
.dshg-ln-void{background:repeating-linear-gradient(135deg,transparent 0 6px,var(--dsw-alias-bg-layer-2) 6px 12px)}
.dshg-ln-void .dshg-snum,.dshg-ln-void .dshg-scode{opacity:.35}
.dshg-shunk{grid-column:1/-1;padding:2px 8px;font-size:11px;word-break:break-all;background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-tertiary)}

/* ---- states ---- */
.dshg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:34px 20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.dshg-empty svg{width:24px;height:24px;color:var(--dsw-alias-label-quaternary)}
.dshg-empty-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dshg-empty-body{font-size:11.5px;line-height:1.6;max-width:34em}
.dshg-err{margin:8px 12px;padding:7px 10px;border-radius:8px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-base));color:var(--dsw-alias-state-error-primary);font-size:11.5px;line-height:1.5;word-break:break-word;max-height:96px;overflow:auto}
.dshg-err-close{float:right;border:0;background:transparent;color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
.dshg-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:26px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.dshg-foot{flex:none;display:flex;align-items:center;gap:10px;padding:5px 10px;border-top:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-quaternary);${SURFACE_CSS};white-space:nowrap;overflow:hidden}
.dshg-foot b{font-weight:500;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}

/* ---- tabs ---- */
.dshg-tabs{flex:none;display:flex;align-items:center;gap:2px;padding:0 10px;border-bottom:.5px solid var(--dsw-alias-border-l3);${SURFACE_CSS}}
.dshg-tab{position:relative;display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 8px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dshg-tab:hover{color:var(--dsw-alias-label-primary)}
.dshg-tab-on{color:var(--dsw-alias-label-primary);font-weight:500}
.dshg-tab-on:after{content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:var(--dsw-alias-state-business-primary)}
.dshg-tab .dshg-count{margin-left:1px}

/* ---- menu / popover (floating: owns its own opaque surface) ---- */
.dshg-menu{position:fixed;z-index:2147482100;display:flex;flex-direction:column;padding:4px;${MENU_CSS};isolation:isolate;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 14px 40px -10px rgba(0,0,0,.5),0 3px 10px -4px rgba(0,0,0,.3);max-height:min(70vh,520px);overflow:hidden}
.dshg-menu-scroll{overflow:auto;max-height:min(46vh,340px)}
.dshg-menu-head{padding:5px 8px 3px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-quaternary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshg-menu-item{display:flex;align-items:center;gap:8px;width:100%;min-height:26px;padding:3px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.dshg-menu-item:hover:not([disabled]){background:var(--dsw-alias-interactive-bg-hover)}
.dshg-menu-item[disabled]{opacity:.45;cursor:default}
.dshg-menu-danger{color:var(--dsw-alias-state-error-primary)}
.dshg-menu-current{color:var(--dsw-alias-state-business-primary)}
.dshg-menu-icon{flex:none;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}
.dshg-menu-icon svg{width:13px;height:13px}
.dshg-menu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-menu-hint{flex:none;font-size:10.5px;color:var(--dsw-alias-label-quaternary);font-variant-numeric:tabular-nums}
.dshg-menu-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l3)}
.dshg-input{box-sizing:border-box;width:100%;height:28px;margin:2px 0 4px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.dshg-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshg-branchpicker{padding:8px}
.dshg-branchpicker .dshg-menu-scroll{margin:0 -4px}
.dshg-branchnew{margin-top:4px;padding-top:6px;border-top:.5px solid var(--dsw-alias-border-l3)}
.dshg-branchnew .dshg-input{margin:0}

/* ---- confirm dialog ---- */
.dshg-confirm-mask{position:fixed;inset:0;z-index:2147482200;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1,#00000059);backdrop-filter:blur(2px)}
.dshg-confirm{width:min(380px,calc(100vw - 32px));padding:16px;border-radius:12px;${SURFACE_CSS};isolation:isolate;border:.5px solid var(--dsw-alias-border-l2);box-shadow:0 20px 50px -12px rgba(0,0,0,.55)}
.dshg-confirm-title{font-size:13px;font-weight:600;margin-bottom:8px}
.dshg-confirm-body{font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary);word-break:break-word}
.dshg-confirm-fields{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.dshg-confirm-field{display:flex;flex-direction:column;gap:4px}
.dshg-confirm-field > span{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-confirm-field .dshg-input{margin:0;height:30px}
.dshg-confirm-ok{padding:0 14px;flex:none}
.dshg-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.dshg-ghost{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dshg-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-danger-btn{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 12px;border:0;border-radius:7px;background:var(--dsw-alias-state-error-primary);color:#fff;font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.dshg-danger-btn:hover{filter:brightness(1.08)}

/* ---- GitLab-style commit detail ---- */
.dshg-gitlab-head{flex:none;padding:10px 14px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dshg-gitlab-title{font-size:13px;font-weight:600;line-height:1.5;color:var(--dsw-alias-label-primary);word-break:break-word}
.dshg-gitlab-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-gitlab-count{font-weight:500;color:var(--dsw-alias-label-secondary)}
.dshg-gitlab-body{margin:8px 0 0;font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;max-height:90px;overflow:auto}
.dshg-gitlab-files{flex:none}
.dshg-gitlab-file{border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-gitlab-row{display:flex;align-items:center;gap:8px;min-height:34px;padding:4px 10px;position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-1)}
.dshg-gitlab-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
/* Direct icons in the file row (file type glyph) \u2014 without this the bare <svg>
 * has no width constraint and blows up to the browser default. */
.dshg-gitlab-row > svg{width:14px;height:14px;flex:none;color:var(--dsw-alias-label-tertiary)}
.dshg-gitlab-toggle{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0}
.dshg-gitlab-toggle svg{width:12px;height:12px;transform:rotate(-90deg);transition:transform .12s}
.dshg-gitlab-file-open .dshg-gitlab-toggle svg{transform:rotate(0deg)}
.dshg-gitlab-path{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;font-size:11.5px;color:var(--dsw-alias-label-primary);font-family:var(--dsh-code-font-family,ui-monospace,monospace)}
.dshg-gitlab-diff{border-top:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);overflow:auto;max-height:50vh}
.dshg-cmeta-row-inline{font-size:11px;color:var(--dsw-alias-label-tertiary)}

/* ---- commit detail (legacy tokens kept for other views) ---- */
/* Same column geometry as the compare panel: a flex child that shares the row.
 * flex:0 0 auto would let the content pick its own width (a long patch line
 * pushed it past 1000000px and squeezed the list to 0) \u2014 it must share instead.
 */
.dshg-cdetail{flex:1 1 60%;min-width:320px}
.dshg-cmeta{flex:none;padding:8px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3);display:flex;flex-direction:column;gap:5px;font-family:inherit}
.dshg-cmeta-subject{font-size:12.5px;font-weight:600;line-height:1.45;word-break:break-word}
.dshg-cmeta-row{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap}
.dshg-cmeta-body{margin:0;font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;max-height:80px;overflow:auto}
.dshg-cmeta-files{display:flex;flex-direction:column;gap:1px;max-height:88px;overflow:auto}
.dshg-cfile{display:flex;align-items:center;gap:8px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.dshg-cfile-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
/* commit detail: file navigation + sticky per-file headings */
.dshg-cdetail-nav{flex:none;display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3);overflow-x:auto;scrollbar-width:thin}
.dshg-cdetail-nav-title{flex:none;font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dshg-cdetail-nav-toggle{flex:none;display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}
.dshg-cdetail-nav-toggle svg{width:12px;height:12px;transition:transform .15s}
.dshg-cdetail-nav-expanded{display:block;max-height:190px;overflow-y:auto;white-space:normal}
.dshg-cdetail-nav-expanded .dshg-cdetail-nav-toggle svg{transform:rotate(180deg)}
.dshg-cdetail-nav-full{max-width:none;width:100%;margin-top:4px;justify-content:flex-start}
.dshg-cdetail-nav-name-full{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left}
.dshg-cdetail-nav-item{flex:none;display:inline-flex;align-items:center;gap:6px;max-width:220px;height:24px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:99px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.dshg-cdetail-nav-item:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-cdetail-nav-on{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary)}
.dshg-cdetail-nav-name{overflow:hidden;text-overflow:ellipsis}
.dshg-cdetail-nav-stat{flex:none;font-size:10px;font-variant-numeric:tabular-nums}
.dshg-cdetail-body{position:relative}
.dshg-cfile-section{scroll-margin-top:4px}
.dshg-cfile-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:5px 10px;background-color:var(--dsw-alias-bg-base);background-image:linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2));border-top:.5px solid var(--dsw-alias-border-l2);border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11.5px;color:var(--dsw-alias-label-primary)}
.dshg-cfile-head svg{width:13px;height:13px;flex:none;color:var(--dsw-alias-label-tertiary)}
.dshg-cfile-head-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsh-code-font-family,ui-monospace,monospace)}

/* ---- upstream compare ---- */
.dshg-compare{flex:1 1 60%;min-width:320px}
.dshg-cmp-body{display:flex;flex-direction:column;font-family:inherit}
.dshg-cmp-group{display:flex;flex-direction:column}
.dshg-cmp-arrow{flex:none;width:14px;text-align:center;font-size:12px;font-weight:700;line-height:1}
.dshg-cmp-in{color:var(--dsw-alias-state-warn-primary)}
.dshg-cmp-out{color:var(--dsw-alias-state-success-primary)}
.dshg-cmp-row{display:flex;align-items:center;gap:8px;min-height:24px;padding:0 8px;cursor:pointer;background:transparent}
.dshg-cmp-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-cmp-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-cmp-subject{min-width:0;flex:1;font-size:12px;line-height:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-cmp-empty{padding:8px 12px;font-size:11px;color:var(--dsw-alias-label-quaternary)}

/* ---- conflicts ---- */
.dshg-row-conflict .dshg-rowname{color:var(--dsw-alias-state-error-primary);font-weight:500}
.dshg-conflict-group .dshg-sechead svg{color:var(--dsw-alias-state-error-primary)}
.dshg-conflict .dshg-diffhead svg{color:var(--dsw-alias-state-error-primary)}
.dshg-cf-actions{flex:none;display:flex;gap:8px;padding:8px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-cf-btn{flex:1;height:28px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.dshg-cf-btn:hover:not([disabled]){background:var(--dsw-alias-interactive-bg-hover)}
.dshg-cf-btn[disabled]{opacity:.5;cursor:default}
.dshg-cf-ours{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 50%,transparent)}
.dshg-cf-theirs{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 50%,transparent)}
.dshg-cf-body{overflow:auto}
.dshg-cf-sides{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-width:0}
.dshg-cf-col{min-width:0;overflow:hidden}
.dshg-cf-col + .dshg-cf-col{border-left:.5px solid var(--dsw-alias-border-l3)}
.dshg-cf-head{position:sticky;top:0;z-index:1;padding:4px 8px;font-size:11px;font-weight:600;line-height:1.6;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}
.dshg-cf-head.dshg-cf-ours{color:var(--dsw-alias-state-business-primary)}
.dshg-cf-head.dshg-cf-theirs{color:var(--dsw-alias-state-success-primary)}
.dshg-cf-code{font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55}
.dshg-cf-line{display:grid;grid-template-columns:34px minmax(0,1fr);min-width:0}
.dshg-cf-num{padding:0 6px;text-align:right;color:var(--dsw-alias-label-quaternary);user-select:none;font-variant-numeric:tabular-nums}
.dshg-cf-text{padding-right:4px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.dshg-cf-ours .dshg-cf-line{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 6%,transparent)}
.dshg-cf-theirs .dshg-cf-line{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 6%,transparent)}
.dshg-cf-raw .dshg-cf-line:nth-child(odd){background:var(--dsw-alias-bg-layer-1)}

/* ---- file browser ---- */
.dshg-files-wrap{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:row;overflow:hidden}
.dshg-files-wrap > .dshg-files{flex:1 1 55%;min-width:360px;max-width:calc(100% - 260px);border-right:0;overflow:auto}
.dshg-files-split{flex:none;width:6px;cursor:col-resize;background:var(--dsw-alias-border-l3);position:relative;z-index:1}
.dshg-files-split:hover,.dshg-files-split[data-drag=true]{background:var(--dsw-alias-state-business-primary)}
.dshg-filerow-on{background:var(--dsw-alias-interactive-bg-active);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}
.dshg-filepreview{flex:1 1 45%;min-width:260px}
.dshg-file-image{flex:1;min-height:0;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:14px;background:var(--dsw-alias-bg-layer-2)}
.dshg-file-image img{max-width:100%;height:auto;border-radius:6px;box-shadow:0 4px 18px -6px rgba(0,0,0,.5)}
.dshg-file-text{flex:1;min-height:0;overflow:auto;font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55}
.dshg-file-textline{display:grid;grid-template-columns:44px minmax(0,1fr);min-width:0}
.dshg-file-textline:hover{background:var(--dsw-alias-interactive-bg-hover)}
/* syntax highlight tokens */
.dshg-tok-comment{color:var(--dsw-alias-label-quaternary);font-style:italic}
.dshg-tok-string{color:var(--dsw-alias-state-success-primary)}
.dshg-tok-number{color:var(--dsw-alias-state-warn-primary)}
.dshg-tok-keyword{color:var(--dsw-alias-state-business-primary);font-weight:600}
.dshg-tok-type{color:#4ec9b0}
.dshg-tok-func{color:#dcdcaa}
/* fullscreen preview */
.dshg-fullmask{position:fixed;inset:0;z-index:9900;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:5vh 5vw}
.dshg-fullscreen{width:100%;height:90vh;max-width:1400px;display:flex;flex-direction:column;background-color:var(--dsw-alias-bg-base);background-image:linear-gradient(var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-1));border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;overflow:hidden;box-shadow:0 24px 80px -20px rgba(0,0,0,.7)}
.dshg-textbtn{display:inline-flex;align-items:center;gap:5px;padding:0 8px;font:inherit;font-size:11px;line-height:1;white-space:nowrap;height:22px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer}
.dshg-textbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-textbtn svg{width:12px;height:12px}
/* editor */
.dshg-editwin{background-image:linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2))}
.dshg-editor{flex:1 1 auto;min-height:0;width:100%;resize:none;border:0;outline:0;padding:14px 18px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12.5px;line-height:1.6;tab-size:2}
.dshg-editfoot{flex:none;display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-quaternary)}
.dshg-dirty{font-size:11px;color:var(--dsw-alias-state-warn-primary)}
.dshg-savebtn{height:24px;padding:0 12px;flex:none;font-size:11px;gap:5px}
.dshg-files{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.dshg-files-bar{flex:none;display:flex;align-items:center;gap:3px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-files-bar .dshg-mini svg{transform:rotate(90deg)}
.dshg-files-root,.dshg-files-crumb{cursor:pointer;padding:2px 4px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.dshg-files-root:hover,.dshg-files-crumb:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-files-root{color:var(--dsw-alias-state-business-primary);font-weight:500}
.dshg-files-sep{color:var(--dsw-alias-label-quaternary)}
.dshg-files-list{flex:1 1 auto;min-height:0;overflow:auto}
.dshg-filerow{display:flex;align-items:center;gap:8px;min-height:26px;padding:0 10px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-primary)}
.dshg-filerow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-filerow:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-fileicon{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}
.dshg-fileicon svg{width:14px;height:14px}
.dshg-filerow:has(.dshg-fileicon svg path[d^="M2.7 2.7h8.6"]) .dshg-fileicon{color:var(--dsw-alias-state-warn-primary)}
.dshg-filename{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-filemeta{flex:none;font-size:10.5px;color:var(--dsw-alias-label-quaternary);font-variant-numeric:tabular-nums}
.dshg-filetime{flex:none;font-size:10.5px;color:var(--dsw-alias-label-quaternary);min-width:92px;text-align:right}
.dshg-history-path{padding:4px 10px;font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsh-code-font-family,ui-monospace,monospace);word-break:break-all;border-bottom:.5px solid var(--dsw-alias-border-l3)}

/* ---- terminal ---- */
.dshg-term{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base)}
.dshg-term-bar{flex:none;display:flex;align-items:center;gap:6px;padding:4px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-term-bar svg{width:12px;height:12px;flex:none}
.dshg-term-title{font-weight:600;color:var(--dsw-alias-label-secondary)}
.dshg-term-cwd{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:10.5px;color:var(--dsw-alias-label-quaternary)}
.dshg-term-log{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 8px;font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55;cursor:text}
.dshg-term-line{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit}
.dshg-term-input{display:flex;gap:6px;align-items:flex-start;padding-top:4px}
.dshg-term-prompt{flex:none;color:var(--dsw-alias-state-business-primary);user-select:none}
.dshg-term-cmd{color:var(--dsw-alias-label-primary);word-break:break-all}
.dshg-term-output{color:var(--dsw-alias-label-secondary)}
.dshg-term-notice{color:var(--dsw-alias-label-quaternary);font-size:10.5px}
.dshg-term-error{color:var(--dsw-alias-state-error-primary);font-size:10.5px}
.dshg-term-suggest{flex:none;display:flex;gap:4px;padding:4px 8px;overflow-x:auto;border-top:.5px solid var(--dsw-alias-border-l3);scrollbar-width:none}
.dshg-term-suggest::-webkit-scrollbar{display:none}
.dshg-chip{flex:none;height:20px;padding:0 7px;border:.5px solid var(--dsw-alias-border-l2);border-radius:99px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font:inherit;font-size:10.5px;cursor:pointer;white-space:nowrap}
.dshg-chip:hover:not([disabled]){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}
.dshg-chip[disabled]{opacity:.45;cursor:default}
.dshg-term-inputrow{flex:none;display:flex;align-items:center;gap:6px;padding:6px 8px;border-top:.5px solid var(--dsw-alias-border-l3);${SURFACE_CSS}}
.dshg-term-field{flex:1;min-width:0;height:28px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:11.5px;outline:none}
.dshg-term-field:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshg-term-run{flex:none;width:auto;padding:0 12px;height:28px;font-size:12px}
`;

// src/client/graph.ts
var LANE_COLORS = [
  "hsl(212 84% 62%)",
  "hsl(156 62% 46%)",
  "hsl(38 92% 58%)",
  "hsl(288 66% 66%)",
  "hsl(6 78% 64%)",
  "hsl(190 72% 50%)",
  "hsl(96 58% 48%)",
  "hsl(330 70% 64%)"
];
function laneColor(lane) {
  const index = (lane % LANE_COLORS.length + LANE_COLORS.length) % LANE_COLORS.length;
  return LANE_COLORS[index];
}
function layoutGraph(commits) {
  const lanes = [];
  const rows = [];
  for (const commit of commits) {
    let lane = lanes.findIndex((entry) => entry.sha === commit.sha);
    const fromTop = lane !== -1;
    if (lane === -1) {
      lane = lanes.findIndex((entry) => entry.sha === null);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push({ sha: null, color: laneColor(lane) });
      }
      lanes[lane].color = laneColor(lane);
    }
    const color = lanes[lane].color;
    const passThrough = [];
    for (let index = 0; index < lanes.length; index += 1) {
      if (index === lane) continue;
      if (lanes[index].sha === null) continue;
      passThrough.push({ lane: index, color: lanes[index].color });
    }
    const [first, ...rest] = commit.parents;
    lanes[lane] = first === void 0 ? { sha: null, color } : { sha: first, color };
    const merges = [];
    for (const parent of rest) {
      let parentLane = lanes.findIndex((entry) => entry.sha === parent);
      if (parentLane === -1) {
        parentLane = lanes.findIndex((entry) => entry.sha === null);
        if (parentLane === -1) {
          parentLane = lanes.length;
          lanes.push({ sha: null, color: laneColor(parentLane) });
        }
        lanes[parentLane] = { sha: parent, color: laneColor(parentLane) };
      }
      merges.push({ lane: parentLane, color: lanes[parentLane].color });
    }
    rows.push({
      sha: commit.sha,
      lane,
      color,
      fromTop,
      passThrough,
      merges,
      toBottom: first !== void 0,
      laneCount: Math.max(lanes.length, 1)
    });
  }
  return rows;
}

// src/client/parts/DiffBody.ts
var React = __toESM(require("react"), 1);
var META_PREFIXES = [
  "diff --git",
  "index ",
  "--- ",
  "+++ ",
  "new file mode",
  "deleted file mode",
  "old mode",
  "new mode",
  "similarity index",
  "dissimilarity index",
  "rename from",
  "rename to",
  "copy from",
  "copy to",
  "Binary files",
  "GIT binary patch"
];
function splitPatchByFile(patch) {
  const lines = patch.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.*?) b\/(.*)$/.exec(line);
      const path = match !== null ? match[2] : line.slice("diff --git ".length);
      current = { path, lines: [] };
      sections.push(current);
    }
    if (current === null) continue;
    current.lines.push(line);
  }
  return sections.map((section) => ({
    path: section.path,
    patch: section.lines.join("\n")
  }));
}
function parsePatch(patch) {
  const out = [];
  let oldNo = 0;
  let newNo = 0;
  const lines = patch.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/.exec(line);
      if (match !== null) {
        oldNo = Number(match[1]);
        newNo = Number(match[2]);
        const tail = (match[3] ?? "").trim();
        out.push({ kind: "hunk", oldNo: null, newNo: null, text: tail === "" ? `@@ -${oldNo} +${newNo} @@` : tail });
      }
      continue;
    }
    if (META_PREFIXES.some((prefix) => line.startsWith(prefix)) || line.startsWith("\\")) continue;
    if (line.startsWith("+")) {
      out.push({ kind: "add", oldNo: null, newNo, text: line.slice(1) });
      newNo += 1;
      continue;
    }
    if (line.startsWith("-")) {
      out.push({ kind: "del", oldNo, newNo: null, text: line.slice(1) });
      oldNo += 1;
      continue;
    }
    out.push({ kind: "ctx", oldNo, newNo, text: line.startsWith(" ") ? line.slice(1) : line });
    oldNo += 1;
    newNo += 1;
  }
  return out;
}
function DiffBody(props) {
  const rows = parsePatch(props.patch);
  if (rows.length === 0) {
    return React.createElement("div", { className: "dshg-diffempty" }, props.empty ?? "\u6CA1\u6709\u53EF\u663E\u793A\u7684\u5DEE\u5F02");
  }
  return React.createElement(
    "table",
    { className: "dshg-difftable" },
    React.createElement(
      "colgroup",
      null,
      React.createElement("col", { style: { width: 40 } }),
      React.createElement("col", { style: { width: 40 } }),
      React.createElement("col", null)
    ),
    React.createElement(
      "tbody",
      null,
      ...rows.map(
        (row, index) => row.kind === "hunk" ? React.createElement(
          "tr",
          { key: index, className: "dshg-hunk" },
          React.createElement("td", { className: "dshg-code", colSpan: 3 }, row.text)
        ) : React.createElement(
          "tr",
          {
            key: index,
            className: row.kind === "add" ? "dshg-ln-add" : row.kind === "del" ? "dshg-ln-del" : void 0
          },
          React.createElement("td", { className: "dshg-num" }, row.oldNo === null ? "" : String(row.oldNo)),
          React.createElement("td", { className: "dshg-num" }, row.newNo === null ? "" : String(row.newNo)),
          React.createElement("td", { className: "dshg-code" }, row.text === "" ? " " : row.text)
        )
      )
    )
  );
}
var EMPTY = () => ({ kind: "void", no: null, text: "" });
function toSplitRows(rows) {
  const out = [];
  let dels = [];
  let adds = [];
  const flush = () => {
    const count = Math.max(dels.length, adds.length);
    for (let index = 0; index < count; index += 1) {
      const del = dels[index];
      const add = adds[index];
      out.push({
        kind: "pair",
        left: del === void 0 ? EMPTY() : { kind: "del", no: del.oldNo, text: del.text },
        right: add === void 0 ? EMPTY() : { kind: "add", no: add.newNo, text: add.text }
      });
    }
    dels = [];
    adds = [];
  };
  for (const row of rows) {
    if (row.kind === "hunk") {
      flush();
      out.push({ kind: "hunk", text: row.text, left: EMPTY(), right: EMPTY() });
      continue;
    }
    if (row.kind === "del") {
      if (adds.length > 0) flush();
      dels.push(row);
      continue;
    }
    if (row.kind === "add") {
      adds.push(row);
      continue;
    }
    flush();
    const cell = { kind: "ctx", no: row.oldNo ?? row.newNo, text: row.text };
    out.push({
      kind: "pair",
      left: cell,
      right: { kind: "ctx", no: row.newNo ?? row.oldNo, text: row.text }
    });
  }
  flush();
  return out;
}
function SplitSide(props) {
  const { cell, side } = props;
  const tone = cell.kind === "add" ? " dshg-ln-add" : cell.kind === "del" ? " dshg-ln-del" : cell.kind === "void" ? " dshg-ln-void" : "";
  return React.createElement(
    "div",
    { className: `dshg-scell${tone}`, "data-side": side },
    React.createElement("span", { className: "dshg-snum" }, cell.no === null ? "" : String(cell.no)),
    React.createElement("span", { className: "dshg-smark" }, cell.kind === "add" ? "+" : cell.kind === "del" ? "\u2212" : " "),
    React.createElement("span", { className: "dshg-scode" }, cell.text === "" ? " " : cell.text)
  );
}
function DiffBodySplit(props) {
  const rows = toSplitRows(parsePatch(props.patch));
  if (rows.length === 0) {
    return React.createElement("div", { className: "dshg-diffempty" }, props.empty ?? "\u6CA1\u6709\u53EF\u663E\u793A\u7684\u5DEE\u5F02");
  }
  return React.createElement(
    "div",
    { className: "dshg-splitview" },
    ...rows.map(
      (row, index) => row.kind === "hunk" ? React.createElement("div", { key: index, className: "dshg-shunk" }, row.text) : React.createElement(
        "div",
        { key: index, className: "dshg-srow" },
        React.createElement(SplitSide, { cell: row.left, side: "left" }),
        React.createElement(SplitSide, { cell: row.right, side: "right" })
      )
    )
  );
}

// src/client/parts/BinaryDiffView.ts
var React2 = __toESM(require("react"), 1);
var IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i;
function BinaryDiffView(props) {
  const { cwd, path } = props;
  const [data, setData] = React2.useState(null);
  const [error, setError] = React2.useState("");
  const [loading, setLoading] = React2.useState(IMAGE_RE.test(path));
  React2.useEffect(() => {
    if (!IMAGE_RE.test(path)) {
      setLoading(false);
      return void 0;
    }
    let alive = true;
    setLoading(true);
    setError("");
    setData(null);
    api.fileContent(cwd, path).then((result) => {
      if (alive) setData(result);
    }).catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [cwd, path]);
  if (!IMAGE_RE.test(path)) {
    return React2.createElement("div", { className: "dshg-diffempty" }, "\u4E8C\u8FDB\u5236\u6587\u4EF6\uFF0C\u65E0\u6CD5\u4EE5\u6587\u672C\u663E\u793A\u5DEE\u5F02");
  }
  if (loading) return React2.createElement("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u8BFB\u53D6\u56FE\u7247\u2026");
  if (error !== "") return React2.createElement("div", { className: "dshg-diffempty" }, error);
  if (data !== null && data.mime !== null && data.base64 !== "") {
    return React2.createElement(
      "div",
      { className: "dshg-file-image" },
      React2.createElement("img", { src: `data:${data.mime};base64,${data.base64}`, alt: path })
    );
  }
  return React2.createElement("div", { className: "dshg-diffempty" }, "\u56FE\u7247\u65E0\u6CD5\u9884\u89C8");
}

// src/client/parts/CommitDetail.ts
var React3 = __toESM(require("react"), 1);

// src/client/parts/highlight.ts
var KEYWORDS = /* @__PURE__ */ new Set([
  // JS/TS
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "new",
  "delete",
  "typeof",
  "instanceof",
  "class",
  "extends",
  "super",
  "this",
  "import",
  "export",
  "from",
  "as",
  "default",
  "async",
  "await",
  "try",
  "catch",
  "finally",
  "throw",
  "yield",
  "in",
  "of",
  "interface",
  "type",
  "enum",
  "implements",
  "public",
  "private",
  "protected",
  "readonly",
  "static",
  "abstract",
  "get",
  "set",
  "declare",
  "namespace",
  "void",
  "null",
  "undefined",
  "true",
  "false",
  // Python
  "def",
  "lambda",
  "pass",
  "with",
  "elif",
  "not",
  "and",
  "or",
  "is",
  "None",
  "True",
  "False",
  "self",
  "raise",
  "global",
  "nonlocal",
  // Go / Rust / general
  "func",
  "package",
  "struct",
  "map",
  "chan",
  "go",
  "defer",
  "var",
  "fn",
  "mut",
  "impl",
  "trait",
  "pub",
  "use",
  "mod",
  "match",
  "loop",
  // SQL / shell-ish
  "select",
  "from",
  "where",
  "insert",
  "update",
  "delete",
  "create",
  "table"
]);
var TYPES = /* @__PURE__ */ new Set([
  "string",
  "number",
  "boolean",
  "any",
  "unknown",
  "never",
  "object",
  "symbol",
  "int",
  "float",
  "str",
  "bool",
  "byte",
  "rune",
  "error",
  "Promise",
  "Array",
  "Record",
  "Map",
  "Set"
]);
var TOKEN_RE = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|\"(?:\\.|[^\"\\])*\"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;
function highlight(line) {
  const out = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index > last) out.push({ text: line.slice(last, match.index), kind: "plain" });
    const raw = match[0];
    if (match[1] !== void 0) {
      out.push({ text: raw, kind: raw.startsWith("//") || raw.startsWith("#") || raw.startsWith("/*") ? "comment" : "string" });
    } else if (match[2] !== void 0) {
      out.push({ text: raw, kind: "number" });
    } else {
      const kind = KEYWORDS.has(raw) ? "keyword" : TYPES.has(raw) ? "type" : lookAheadIsCall(line, match.index + raw.length) ? "func" : "plain";
      out.push({ text: raw, kind });
    }
    last = match.index + raw.length;
  }
  if (last < line.length) out.push({ text: line.slice(last), kind: "plain" });
  return out;
}
function lookAheadIsCall(line, index) {
  let i = index;
  while (i < line.length && (line[i] === " " || line[i] === "	")) i += 1;
  return line[i] === "(";
}
function languageOf(name2) {
  const ext = name2.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript";
  if (["py", "pyw"].includes(ext)) return "python";
  if (["go"].includes(ext)) return "go";
  if (["rs"].includes(ext)) return "rust";
  if (["json"].includes(ext)) return "json";
  if (["css", "scss", "less"].includes(ext)) return "css";
  if (["html", "htm", "xml", "svg"].includes(ext)) return "markup";
  if (["md", "markdown"].includes(ext)) return "markdown";
  if (["sh", "bash", "zsh", "ps1", "bat", "cmd"].includes(ext)) return "shell";
  if (["yml", "yaml"].includes(ext)) return "yaml";
  if (["sql"].includes(ext)) return "sql";
  return "text";
}

// src/client/parts/CommitDetail.ts
var h = React3.createElement;
function Icon(props) {
  return h("svg", { viewBox: "0 0 16 16", "aria-hidden": "true" }, h("path", { d: ICONS[props.name], fill: "currentColor" }));
}
function CodeView(props) {
  const lines = props.text.split("\n");
  const lang = languageOf(props.name);
  return h(
    "div",
    { className: `dshg-file-text dshg-lang-${lang}` },
    ...lines.map(
      (line, index) => h(
        "div",
        { key: index, className: "dshg-file-textline" },
        h("span", { className: "dshg-snum" }, index + 1),
        h(
          "span",
          { className: "dshg-code" },
          ...line === "" ? [" "] : highlight(line).map(
            (token, i) => h("span", { key: i, className: token.kind === "plain" ? void 0 : `dshg-tok-${token.kind}` }, token.text)
          )
        )
      )
    )
  );
}
function FileAtCommitModal(props) {
  const { cwd, sha, path, onClose } = props;
  const [text, setText] = React3.useState("");
  const [error, setError] = React3.useState("");
  const [loading, setLoading] = React3.useState(true);
  React3.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setText("");
    api.commitFile(cwd, sha, path).then((result) => {
      if (alive) setText(result.text);
    }).catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [cwd, sha, path]);
  return h(
    "div",
    { className: "dshg-fullmask", onClick: onClose },
    h(
      "div",
      { className: "dshg-fullscreen", onClick: (event) => event.stopPropagation() },
      h(
        "div",
        { className: "dshg-diffhead" },
        h(Icon, { name: "file" }),
        h("span", { className: "dshg-diffpath", title: path }, path),
        h("span", { className: "dshg-cmeta-row-inline" }, `${sha.slice(0, 7)} \u65F6\u7684\u5185\u5BB9`),
        h("span", { className: "dshg-spacer" }),
        h("button", { type: "button", className: "dshg-mini", title: "\u5173\u95ED", onClick: onClose }, h(Icon, { name: "close" }))
      ),
      h(
        "div",
        { className: "dshg-diffbody" },
        loading ? h("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u2026") : null,
        !loading && error !== "" ? h("div", { className: "dshg-diffempty" }, error) : null,
        !loading && error === "" ? h(CodeView, { text, name: path }) : null
      )
    )
  );
}
function CommitDetailView(props) {
  const { cwd, sha, split, onToggleSplit, onClose } = props;
  const [detail, setDetail] = React3.useState(null);
  const [error, setError] = React3.useState("");
  const [loading, setLoading] = React3.useState(true);
  const [expanded, setExpanded] = React3.useState(/* @__PURE__ */ new Set());
  const [viewFile, setViewFile] = React3.useState("");
  React3.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setDetail(null);
    setExpanded(/* @__PURE__ */ new Set());
    api.commitDetail(cwd, sha).then((result) => {
      if (alive) setDetail(result.commit);
    }).catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [cwd, sha]);
  const toggle = (path) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return next;
  });
  const parts = detail === null ? [] : splitPatchByFile(detail.patch);
  const partByPath = new Map(parts.map((part) => [part.path, part]));
  const statOf = (path) => detail?.files.find((file) => file.path === path);
  const rows = [];
  if (detail !== null) {
    for (const file of detail.files) rows.push(file.path);
    for (const part of parts) if (!rows.includes(part.path)) rows.push(part.path);
  }
  return h(
    React3.Fragment,
    null,
    h(
      "div",
      { className: "dshg-diff dshg-cdetail" },
      h(
        "div",
        { className: "dshg-diffhead" },
        h(Icon, { name: "commit" }),
        h("span", { className: "dshg-diffpath" }, `\u63D0\u4EA4 ${sha.slice(0, 7)}`),
        detail !== null ? h(
          "span",
          { className: "dshg-rowstat" },
          h("span", { className: "dshg-add" }, `+${detail.added}`),
          h("span", { className: "dshg-del" }, `\u2212${detail.removed}`)
        ) : null,
        h("span", { className: "dshg-spacer" }),
        h(
          "button",
          {
            type: "button",
            className: "dshg-mini",
            title: split ? "\u5207\u6362\u4E3A\u884C\u5185\u89C6\u56FE" : "\u5207\u6362\u4E3A\u5E76\u6392\u89C6\u56FE",
            "aria-pressed": split,
            onClick: onToggleSplit
          },
          h("span", { className: "dshg-viewtoggle" }, split ? "\u5E76\u6392" : "\u884C\u5185")
        ),
        h("button", { type: "button", className: "dshg-mini", title: "\u5173\u95ED\uFF08Esc\uFF09", onClick: onClose }, h(Icon, { name: "close" }))
      ),
      h(
        "div",
        { className: "dshg-diffbody dshg-cdetail-body" },
        loading ? h("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u8BFB\u53D6\u63D0\u4EA4\u2026") : null,
        !loading && error !== "" ? h("div", { className: "dshg-diffempty" }, error) : null,
        !loading && detail !== null && rows.length === 0 ? h("div", { className: "dshg-diffempty" }, "\u8FD9\u4E2A\u63D0\u4EA4\u6CA1\u6709\u6587\u4EF6\u53D8\u66F4") : null,
        !loading && detail !== null ? h(
          React3.Fragment,
          null,
          // concise commit header (no wall of chips)
          h(
            "div",
            { className: "dshg-gitlab-head" },
            h("div", { className: "dshg-gitlab-title" }, detail.subject === "" ? "(no message)" : detail.subject),
            h(
              "div",
              { className: "dshg-gitlab-meta" },
              h("span", { className: "dshg-gsha" }, detail.short),
              h("span", null, detail.author),
              h("span", { title: new Date(detail.time * 1e3).toLocaleString() }, new Date(detail.time * 1e3).toLocaleString()),
              h("span", { className: "dshg-gitlab-count" }, `${rows.length} \u4E2A\u6587\u4EF6`),
              h("span", { className: "dshg-add" }, `+${detail.added}`),
              h("span", { className: "dshg-del" }, `\u2212${detail.removed}`)
            ),
            detail.body.trim() === "" ? null : h("pre", { className: "dshg-gitlab-body" }, detail.body.trim())
          ),
          // file list
          h(
            "div",
            { className: "dshg-gitlab-files" },
            ...rows.map((path) => {
              const stat = statOf(path);
              const part = partByPath.get(path);
              const isOpen = expanded.has(path);
              return h(
                "div",
                { key: path, className: `dshg-gitlab-file${isOpen ? " dshg-gitlab-file-open" : ""}` },
                h(
                  "div",
                  { className: "dshg-gitlab-row" },
                  h(
                    "button",
                    {
                      type: "button",
                      className: "dshg-gitlab-toggle",
                      title: isOpen ? "\u6536\u8D77\u5DEE\u5F02" : "\u5C55\u5F00\u5DEE\u5F02",
                      onClick: () => toggle(path)
                    },
                    h(Icon, { name: "chevron" })
                  ),
                  h(Icon, { name: "file" }),
                  h("span", { className: "dshg-gitlab-path", title: path }, path),
                  stat !== void 0 && !stat.binary ? h(
                    "span",
                    { className: "dshg-rowstat" },
                    h("span", { className: "dshg-add" }, `+${stat.added}`),
                    h("span", { className: "dshg-del" }, `\u2212${stat.removed}`)
                  ) : stat?.binary ? h("span", { className: "dshg-rowstat" }, "\u4E8C\u8FDB\u5236") : null,
                  h(
                    "button",
                    {
                      type: "button",
                      className: "dshg-mini dshg-textbtn",
                      title: "\u67E5\u770B\u8FD9\u4E2A\u63D0\u4EA4\u4E0B\u7684\u5B8C\u6574\u6587\u4EF6\u5185\u5BB9",
                      onClick: () => setViewFile(path)
                    },
                    "\u67E5\u770B\u6587\u4EF6"
                  )
                ),
                isOpen ? h(
                  "div",
                  { className: "dshg-gitlab-diff" },
                  part !== void 0 ? h(split ? DiffBodySplit : DiffBody, { patch: part.patch }) : h("div", { className: "dshg-diffempty" }, "\u4E8C\u8FDB\u5236\u6587\u4EF6\uFF0C\u6CA1\u6709\u6587\u672C\u5DEE\u5F02")
                ) : null
              );
            })
          ),
          detail.tooLarge ? h("div", { className: "dshg-diffempty" }, "\u5DEE\u5F02\u8FC7\u5927\uFF0C\u4EC5\u663E\u793A\u524D 60 \u4E07\u5B57\u7B26") : null
        ) : null
      )
    ),
    viewFile !== "" ? h(FileAtCommitModal, { cwd, sha, path: viewFile, onClose: () => setViewFile("") }) : null
  );
}

// src/client/parts/ConflictPanel.ts
var React4 = __toESM(require("react"), 1);
var h2 = React4.createElement;
function Icon2(props) {
  return h2("svg", { viewBox: "0 0 16 16", "aria-hidden": "true" }, h2("path", { d: ICONS[props.name], fill: "currentColor" }));
}
function CodeBlock(props) {
  const lines = props.text === "" ? ["\uFF08\u6B64\u4FA7\u6587\u4EF6\u4E0D\u5B58\u5728 \u2014 \u5220\u9664\u51B2\u7A81\uFF09"] : props.text.split("\n");
  return h2(
    "div",
    { className: `dshg-cf-code dshg-cf-${props.tone}` },
    ...lines.map(
      (line, index) => h2(
        "div",
        { key: index, className: "dshg-cf-line" },
        h2("span", { className: "dshg-cf-num" }, index + 1),
        h2("span", { className: "dshg-cf-text" }, line === "" ? " " : line)
      )
    )
  );
}
function ConflictPanel(props) {
  const { cwd, file, onClose, onResolved } = props;
  const [data, setData] = React4.useState(null);
  const [error, setError] = React4.useState("");
  const [loading, setLoading] = React4.useState(true);
  const [busy, setBusy] = React4.useState("");
  const [view, setView] = React4.useState("sides");
  const load = React4.useCallback(() => {
    setLoading(true);
    setError("");
    api.conflicts(cwd, [file]).then((result) => setData(result.conflicts[0] ?? null)).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setLoading(false));
  }, [cwd, file]);
  React4.useEffect(load, [load]);
  const resolve = (side) => {
    setBusy(side);
    setError("");
    api.resolveConflict(cwd, [file], side).then(() => {
      onResolved();
      onClose();
    }).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setBusy(""));
  };
  return h2(
    "div",
    { className: "dshg-diff dshg-conflict" },
    h2(
      "div",
      { className: "dshg-diffhead" },
      h2(Icon2, { name: "warning" }),
      h2("span", { className: "dshg-diffpath", title: file }, `\u51B2\u7A81\uFF1A${file}`),
      h2("span", { className: "dshg-spacer" }),
      h2(
        "button",
        {
          type: "button",
          className: "dshg-mini",
          title: view === "sides" ? "\u67E5\u770B\u5E26\u6807\u8BB0\u7684\u539F\u6587" : "\u67E5\u770B\u53CC\u65B9\u5BF9\u6BD4",
          onClick: () => setView((prev) => prev === "sides" ? "raw" : "sides")
        },
        h2("span", { className: "dshg-viewtoggle" }, view === "sides" ? "\u53CC\u65B9" : "\u539F\u6587")
      ),
      h2("button", { type: "button", className: "dshg-mini", title: "\u5173\u95ED", onClick: onClose }, h2(Icon2, { name: "close" }))
    ),
    h2(
      "div",
      { className: "dshg-cf-actions" },
      h2(
        "button",
        { type: "button", className: "dshg-cf-btn dshg-cf-ours", disabled: busy !== "", onClick: () => resolve("ours") },
        busy === "ours" ? "\u89E3\u51B3\u4E2D\u2026" : "\u91C7\u7528\u5F53\u524D\u5206\u652F\uFF08ours\uFF09"
      ),
      h2(
        "button",
        { type: "button", className: "dshg-cf-btn dshg-cf-theirs", disabled: busy !== "", onClick: () => resolve("theirs") },
        busy === "theirs" ? "\u89E3\u51B3\u4E2D\u2026" : "\u91C7\u7528\u4F20\u5165\u5206\u652F\uFF08theirs\uFF09"
      )
    ),
    error !== "" ? h2("div", { className: "dshg-err" }, error) : null,
    h2(
      "div",
      { className: "dshg-diffbody dshg-cf-body" },
      loading ? h2("div", { className: "dshg-diffempty" }, "\u8BFB\u53D6\u51B2\u7A81\u5185\u5BB9\u2026") : null,
      !loading && data === null && error === "" ? h2("div", { className: "dshg-diffempty" }, "\u8FD9\u4E2A\u6587\u4EF6\u5DF2\u7ECF\u6CA1\u6709\u51B2\u7A81\u4E86") : null,
      !loading && data !== null && view === "sides" ? h2(
        "div",
        { className: "dshg-cf-sides" },
        h2(
          "div",
          { className: "dshg-cf-col" },
          h2("div", { className: "dshg-cf-head dshg-cf-ours" }, "\u5F53\u524D\u5206\u652F \xB7 ours\uFF08HEAD\uFF09"),
          h2(CodeBlock, { text: data.ours, tone: "ours" })
        ),
        h2(
          "div",
          { className: "dshg-cf-col" },
          h2("div", { className: "dshg-cf-head dshg-cf-theirs" }, "\u4F20\u5165\u5206\u652F \xB7 theirs\uFF08MERGE_HEAD\uFF09"),
          h2(CodeBlock, { text: data.theirs, tone: "theirs" })
        )
      ) : null,
      !loading && data !== null && view === "raw" ? h2(
        "div",
        { className: "dshg-cf-col" },
        h2("div", { className: "dshg-cf-head" }, "\u5DE5\u4F5C\u533A\u539F\u6587\uFF08\u542B\u51B2\u7A81\u6807\u8BB0\uFF09"),
        h2(CodeBlock, { text: data.worktree, tone: "raw" })
      ) : null
    )
  );
}

// src/client/parts/ConfirmDialog.ts
var React5 = __toESM(require("react"), 1);
function ConfirmDialog(props) {
  const { confirm, onClose } = props;
  const fields = confirm.fields ?? [];
  const [values, setValues] = React5.useState(() => {
    const initial = {};
    for (const field of fields) initial[field.name] = field.value;
    return initial;
  });
  const firstRef = React5.useRef(null);
  React5.useEffect(() => {
    firstRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const submit = () => {
    const task = confirm.run;
    onClose();
    task(values);
  };
  return React5.createElement(
    "div",
    { className: "dshg-confirm-mask", onClick: onClose },
    React5.createElement(
      "div",
      { className: "dshg-confirm", onClick: (event) => event.stopPropagation() },
      React5.createElement("div", { className: "dshg-confirm-title" }, confirm.title),
      React5.createElement("div", { className: "dshg-confirm-body" }, confirm.body),
      fields.length > 0 ? React5.createElement(
        "div",
        { className: "dshg-confirm-fields" },
        ...fields.map(
          (field, index) => React5.createElement(
            "label",
            { key: field.name, className: "dshg-confirm-field" },
            React5.createElement("span", null, field.label),
            React5.createElement("input", {
              ref: index === 0 ? firstRef : void 0,
              className: "dshg-input",
              value: values[field.name] ?? "",
              placeholder: field.placeholder,
              spellCheck: false,
              autoComplete: "off",
              onChange: (event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value })),
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }
            })
          )
        )
      ) : null,
      React5.createElement(
        "div",
        { className: "dshg-confirm-actions" },
        React5.createElement("button", { type: "button", className: "dshg-ghost", onClick: onClose }, "\u53D6\u6D88"),
        React5.createElement(
          "button",
          {
            type: "button",
            className: confirm.danger === true ? "dshg-danger-btn" : "dshg-primary dshg-confirm-ok",
            onClick: submit
          },
          confirm.okLabel ?? "\u786E\u8BA4\u6267\u884C"
        )
      )
    )
  );
}

// src/client/parts/FileBrowser.ts
var React7 = __toESM(require("react"), 1);

// src/client/parts/Menu.ts
var React6 = __toESM(require("react"), 1);
function Menu(props) {
  const { x, y, items, onClose, width = 214 } = props;
  const ref = React6.useRef(null);
  const [pos, setPos] = React6.useState({ left: x, top: y });
  React6.useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const rect = node.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = y + rect.height > window.innerHeight - 8 ? Math.max(8, y - rect.height) : y;
    setPos({ left, top });
  }, [x, y]);
  React6.useEffect(() => {
    const onDown = (event) => {
      if (ref.current !== null && !ref.current.contains(event.target)) onClose();
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);
  return React6.createElement(
    "div",
    {
      ref,
      className: "dshg-menu",
      role: "menu",
      style: { left: pos.left, top: pos.top, width },
      onContextMenu: (event) => event.preventDefault()
    },
    ...items.map(
      (item, index) => item.heading === true ? React6.createElement("div", { key: item.id, className: "dshg-menu-head" }, item.label) : React6.createElement(
        React6.Fragment,
        { key: item.id },
        item.separated === true ? React6.createElement("div", { className: "dshg-menu-sep" }) : null,
        React6.createElement(
          "button",
          {
            type: "button",
            role: "menuitem",
            className: `dshg-menu-item${item.danger === true ? " dshg-menu-danger" : ""}`,
            disabled: item.disabled === true,
            onClick: () => {
              if (item.disabled === true) return;
              onClose();
              item.onSelect?.();
            }
          },
          React6.createElement("span", { className: "dshg-menu-icon" }, item.icon ?? null),
          React6.createElement("span", { className: "dshg-menu-label" }, item.label),
          item.hint === void 0 ? null : React6.createElement("span", { className: "dshg-menu-hint" }, item.hint)
        ),
        index === items.length - 1 ? null : null
      )
    )
  );
}

// src/client/parts/FileBrowser.ts
var h3 = React7.createElement;
function Icon3(props) {
  return h3("svg", { viewBox: "0 0 16 16", "aria-hidden": "true" }, h3("path", { d: ICONS[props.name], fill: "currentColor" }));
}
function fmtSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
function fmtTime(seconds) {
  if (!seconds) return "";
  const d = new Date(seconds * 1e3);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
function CodeText(props) {
  const lang = languageOf(props.name);
  const lines = props.text.split("\n");
  return h3(
    "div",
    { className: `dshg-file-text dshg-lang-${lang}` },
    ...lines.map(
      (line, index) => h3(
        "div",
        { key: index, className: "dshg-file-textline" },
        h3("span", { className: "dshg-snum" }, index + 1),
        h3(
          "span",
          { className: "dshg-code" },
          ...line === "" ? [" "] : highlight(line).map(
            (token, i) => h3("span", { key: i, className: token.kind === "plain" ? void 0 : `dshg-tok-${token.kind}` }, token.text)
          )
        )
      )
    )
  );
}
function FilePreviewPane(props) {
  const { cwd, file, onNotice, onClose } = props;
  const [data, setData] = React7.useState(null);
  const [error, setError] = React7.useState("");
  const [loading, setLoading] = React7.useState(true);
  const [fullscreen, setFullscreen] = React7.useState(false);
  const [editing, setEditing] = React7.useState(false);
  const [draft, setDraft] = React7.useState("");
  const [saving, setSaving] = React7.useState(false);
  const [dirty, setDirty] = React7.useState(false);
  const [showChanges, setShowChanges] = React7.useState(false);
  const [diffPatch, setDiffPatch] = React7.useState("");
  const [diffLoading, setDiffLoading] = React7.useState(false);
  React7.useEffect(() => {
    if (!editing) return void 0;
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !saving) save();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editing, dirty, saving, draft]);
  React7.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setData(null);
    setShowChanges(false);
    setFullscreen(false);
    setEditing(false);
    setDirty(false);
    api.fileContent(cwd, file.path).then((result) => {
      if (alive) setData(result);
    }).catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [cwd, file.path]);
  const loadChanges = () => {
    setShowChanges(true);
    setDiffLoading(true);
    setDiffPatch("");
    api.diff(cwd, file.path, false, "").then((result) => setDiffPatch(result.patch ?? "")).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setDiffLoading(false));
  };
  const startEdit = () => {
    if (data === null || data.text === null) return;
    setDraft(data.text);
    setDirty(false);
    setEditing(true);
  };
  const save = () => {
    if (!dirty) return;
    setSaving(true);
    setError("");
    api.writeFile(cwd, file.path, draft).then((result) => {
      setDirty(false);
      setData((prev) => prev === null ? prev : { ...prev, text: draft, size: result.size });
      onNotice(`\u5DF2\u4FDD\u5B58 ${file.name}`);
    }).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setSaving(false));
  };
  const image = () => h3("div", { className: "dshg-file-image" }, h3("img", { src: `data:${data?.mime};base64,${data?.base64}`, alt: file.name }));
  const body = () => {
    if (loading) return h3("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u2026");
    if (error !== "") return h3("div", { className: "dshg-diffempty" }, error);
    if (data === null) return h3("div", { className: "dshg-diffempty" }, "\u6CA1\u6709\u5185\u5BB9");
    if (data.tooLarge) {
      return h3("div", { className: "dshg-diffempty" }, `\u6587\u4EF6\u592A\u5927\uFF08${fmtSize(data.size)}\uFF09\uFF0C\u65E0\u6CD5\u5728\u63D2\u4EF6\u5185\u9884\u89C8`);
    }
    if (data.binary) {
      return h3("div", { className: "dshg-diffempty" }, "\u4E8C\u8FDB\u5236\u6587\u4EF6\uFF0C\u65E0\u6CD5\u9884\u89C8\u5185\u5BB9");
    }
    if (data.mime !== null && data.base64 !== "") return image();
    if (showChanges) {
      return diffLoading ? h3("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u8BFB\u53D6\u53D8\u66F4\u2026") : h3(DiffBody, { patch: diffPatch, empty: "\u8FD9\u4E2A\u6587\u4EF6\u6CA1\u6709\u672A\u63D0\u4EA4\u7684\u53D8\u66F4" });
    }
    if (data.text !== null) return h3(CodeText, { text: data.text, name: file.name });
    return h3("div", { className: "dshg-diffempty" }, "\u6CA1\u6709\u53EF\u9884\u89C8\u7684\u5185\u5BB9");
  };
  const canShowChanges = data !== null && data.mime === null && !data.binary && !data.tooLarge;
  const canFullscreen = data !== null && !data.binary && !data.tooLarge;
  const canEdit = data !== null && !data.binary && !data.tooLarge && data.mime === null && data.text !== null;
  const header = (inFullscreen) => h3(
    "div",
    { className: "dshg-diffhead" },
    h3(Icon3, { name: file.isImage ? "spark" : "file" }),
    h3("span", { className: "dshg-diffpath", title: file.path }, file.name),
    h3("span", { className: "dshg-spacer" }),
    canShowChanges ? h3(
      "button",
      {
        type: "button",
        className: "dshg-mini dshg-textbtn",
        title: "\u67E5\u770B\u8FD9\u4E2A\u6587\u4EF6\u672A\u63D0\u4EA4\u7684\u53D8\u66F4",
        onClick: () => {
          if (showChanges) setShowChanges(false);
          else loadChanges();
        }
      },
      showChanges ? "\u67E5\u770B\u6587\u4EF6" : "\u67E5\u770B\u53D8\u66F4"
    ) : null,
    canEdit && !inFullscreen ? h3(
      "button",
      {
        type: "button",
        className: "dshg-mini dshg-textbtn",
        title: "\u7F16\u8F91\u8FD9\u4E2A\u6587\u4EF6",
        onClick: startEdit
      },
      h3(Icon3, { name: "edit" }),
      "\u7F16\u8F91"
    ) : null,
    canFullscreen && !inFullscreen ? h3(
      "button",
      {
        type: "button",
        className: "dshg-mini dshg-textbtn",
        title: "\u5168\u5C4F\u663E\u793A",
        onClick: () => setFullscreen(true)
      },
      h3(Icon3, { name: "maximize" }),
      "\u5168\u5C4F\u663E\u793A"
    ) : null,
    h3(
      "button",
      { type: "button", className: "dshg-mini", title: "\u7528\u7CFB\u7EDF\u9ED8\u8BA4\u5E94\u7528\u6253\u5F00", onClick: () => {
        void api.openPath(cwd, file.path, false).catch((err) => onNotice(err instanceof Error ? err.message : String(err)));
      } },
      h3(Icon3, { name: "folder" })
    ),
    h3(
      "button",
      { type: "button", className: "dshg-mini", title: inFullscreen ? "\u5173\u95ED\u5168\u5C4F" : "\u5173\u95ED\u9884\u89C8", onClick: inFullscreen ? () => setFullscreen(false) : onClose },
      h3(Icon3, { name: "close" })
    )
  );
  return h3(
    React7.Fragment,
    null,
    h3(
      "div",
      { className: "dshg-diff dshg-filepreview" },
      header(false),
      h3("div", { className: "dshg-diffbody" }, body())
    ),
    fullscreen ? h3(
      "div",
      { className: "dshg-fullmask", onClick: () => setFullscreen(false) },
      h3(
        "div",
        { className: "dshg-fullscreen", onClick: (event) => event.stopPropagation() },
        header(true),
        h3("div", { className: "dshg-diffbody" }, body())
      )
    ) : null,
    editing ? h3(
      "div",
      {
        className: "dshg-fullmask",
        onClick: () => setEditing(false)
      },
      h3(
        "div",
        { className: "dshg-fullscreen dshg-editwin", onClick: (event) => event.stopPropagation() },
        h3(
          "div",
          { className: "dshg-diffhead" },
          h3(Icon3, { name: "edit" }),
          h3("span", { className: "dshg-diffpath", title: file.path }, `\u7F16\u8F91 ${file.name}`),
          dirty ? h3("span", { className: "dshg-dirty" }, "\u25CF \u672A\u4FDD\u5B58") : null,
          h3("span", { className: "dshg-spacer" }),
          h3(
            "button",
            {
              type: "button",
              className: "dshg-primary dshg-savebtn",
              disabled: saving || !dirty,
              onClick: save
            },
            h3(Icon3, { name: "check" }),
            saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58"
          ),
          h3(
            "button",
            {
              type: "button",
              className: "dshg-mini",
              title: "\u5173\u95ED",
              onClick: () => setEditing(false)
            },
            h3(Icon3, { name: "close" })
          )
        ),
        error !== "" ? h3("div", { className: "dshg-err" }, error) : null,
        h3("textarea", {
          className: "dshg-editor",
          value: draft,
          spellCheck: false,
          onChange: (event) => {
            setDraft(event.target.value);
            setDirty(true);
          }
        }),
        h3(
          "div",
          { className: "dshg-editfoot" },
          `${draft.split("\n").length} \u884C`,
          h3("span", { className: "dshg-spacer" }),
          dirty ? "Ctrl+S \u4FDD\u5B58" : "\u6CA1\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539"
        )
      )
    ) : null
  );
}
function FileBrowser(props) {
  const { cwd, active, onHistory, onNotice } = props;
  const [dir, setDir] = React7.useState("");
  const [data, setData] = React7.useState(null);
  const [error, setError] = React7.useState("");
  const [loading, setLoading] = React7.useState(true);
  const [menu, setMenu] = React7.useState(null);
  const [preview, setPreview] = React7.useState(null);
  const [listWidth, setListWidth] = React7.useState(null);
  const dragRef = React7.useRef(null);
  const startDrag = (event) => {
    const wrap = event.currentTarget.parentElement;
    if (wrap === null) return;
    const list = wrap.querySelector(".dshg-files");
    if (list === null) return;
    dragRef.current = { startX: event.clientX, startW: list.getBoundingClientRect().width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onDrag = (event) => {
    if (dragRef.current === null) return;
    setListWidth(Math.max(260, dragRef.current.startW + event.clientX - dragRef.current.startX));
  };
  const endDrag = () => {
    dragRef.current = null;
  };
  const load = React7.useCallback(
    (target) => {
      setLoading(true);
      setError("");
      api.files(cwd, target).then((result) => {
        setData({ dir: result.dir, entries: result.entries });
        setDir(result.dir);
      }).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setLoading(false));
    },
    [cwd]
  );
  React7.useEffect(() => {
    load("");
  }, [load]);
  const up = () => {
    const parts = dir.split("/").filter(Boolean);
    parts.pop();
    load(parts.join("/"));
  };
  const isImageName = (name2) => /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i.test(name2);
  const openEntry = (entry) => {
    if (entry.kind === "dir") {
      setPreview(null);
      load(entry.rel);
    } else {
      setPreview({ path: entry.rel, name: entry.name, isImage: isImageName(entry.name) });
    }
  };
  const openExternally = (entry) => {
    void api.openPath(cwd, entry.path, false).then(() => onNotice(`\u5DF2\u7528\u9ED8\u8BA4\u5E94\u7528\u6253\u5F00 ${entry.name}`)).catch((err) => onNotice(err instanceof Error ? err.message : String(err)));
  };
  const contextMenu = (event, entry) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        { id: "h", label: entry.name, heading: true },
        {
          id: "open",
          label: entry.kind === "dir" ? "\u8FDB\u5165\u6587\u4EF6\u5939" : "\u67E5\u770B\u6587\u4EF6\u5185\u5BB9",
          icon: h3(Icon3, { name: "file" }),
          onSelect: () => openEntry(entry)
        },
        {
          id: "external",
          label: "\u7528\u7CFB\u7EDF\u9ED8\u8BA4\u5E94\u7528\u6253\u5F00",
          separated: entry.kind === "dir",
          onSelect: () => openExternally(entry)
        },
        {
          id: "reveal",
          label: "\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u663E\u793A\u4F4D\u7F6E",
          onSelect: () => {
            void api.openPath(cwd, entry.path, true).then(() => onNotice("\u5DF2\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u5B9A\u4F4D")).catch((err) => onNotice(err instanceof Error ? err.message : String(err)));
          }
        },
        {
          id: "copy",
          label: "\u590D\u5236\u8DEF\u5F84",
          icon: h3(Icon3, { name: "branch" }),
          onSelect: () => {
            void copyText(entry.path).then((ok) => onNotice(ok ? "\u5DF2\u590D\u5236\u5B8C\u6574\u8DEF\u5F84" : "\u590D\u5236\u5931\u8D25"));
          }
        },
        {
          id: "copy-rel",
          label: "\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84",
          onSelect: () => {
            void copyText(entry.rel).then((ok) => onNotice(ok ? "\u5DF2\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84" : "\u590D\u5236\u5931\u8D25"));
          }
        },
        {
          id: "history",
          label: "\u663E\u793A Git \u5386\u53F2",
          separated: true,
          icon: h3(Icon3, { name: "history" }),
          onSelect: () => onHistory(entry.rel)
        },
        {
          id: "reference",
          label: "\u5F15\u7528\u5230\u8F93\u5165\u6846",
          hint: "@\u8DEF\u5F84",
          onSelect: () => {
            void copyText(`@${entry.rel}`).then(
              (ok) => onNotice(ok ? "\u5DF2\u590D\u5236 @\u8DEF\u5F84\uFF0C\u7C98\u8D34\u5230\u8F93\u5165\u6846\u5373\u53EF\u5F15\u7528" : "\u590D\u5236\u5931\u8D25")
            );
          }
        }
      ]
    });
  };
  const crumbs = dir === "" ? [] : dir.split("/").filter(Boolean);
  const selectedRel = preview?.path ?? "";
  return h3(
    "div",
    { className: "dshg-files-wrap" },
    h3(
      "div",
      { className: "dshg-files", style: listWidth === null ? void 0 : { flex: `0 0 ${listWidth}px` } },
      h3(
        "div",
        { className: "dshg-files-bar" },
        h3(
          "button",
          { type: "button", className: "dshg-mini", title: "\u8FD4\u56DE\u4E0A\u7EA7", disabled: dir === "", onClick: up },
          h3(Icon3, { name: "chevron" })
        ),
        h3("span", { className: "dshg-files-root", title: cwd, onClick: () => load("") }, "\u4ED3\u5E93"),
        ...crumbs.map(
          (crumb, index) => h3(
            React7.Fragment,
            { key: `${crumb}-${index}` },
            h3("span", { className: "dshg-files-sep" }, "/"),
            h3(
              "span",
              {
                className: "dshg-files-crumb",
                onClick: () => load(crumbs.slice(0, index + 1).join("/"))
              },
              crumb
            )
          )
        ),
        h3("span", { className: "dshg-spacer" }),
        h3(
          "button",
          { type: "button", className: "dshg-mini", title: "\u5237\u65B0", onClick: () => load(dir) },
          h3(Icon3, { name: "refresh" })
        )
      ),
      error !== "" ? h3("div", { className: "dshg-err" }, error) : null,
      h3(
        "div",
        { className: "dshg-files-list" },
        loading ? h3("div", { className: "dshg-loading" }, "\u8BFB\u53D6\u6587\u4EF6\u2026") : null,
        !loading && data !== null && data.entries.length === 0 ? h3("div", { className: "dshg-diffempty" }, "\u8FD9\u4E2A\u6587\u4EF6\u5939\u662F\u7A7A\u7684") : null,
        !loading && data !== null ? data.entries.map(
          (entry) => h3(
            "div",
            {
              key: entry.path,
              className: `dshg-filerow${selectedRel === entry.rel ? " dshg-filerow-on" : ""}`,
              role: "button",
              tabIndex: 0,
              title: entry.path,
              onClick: () => openEntry(entry),
              onDoubleClick: () => openExternally(entry),
              onContextMenu: (event) => contextMenu(event, entry),
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  openEntry(entry);
                }
              }
            },
            h3(
              "span",
              { className: "dshg-fileicon" },
              h3(Icon3, { name: entry.kind === "dir" ? "folder" : "file" })
            ),
            h3("span", { className: "dshg-filename" }, entry.name),
            h3(
              "span",
              { className: "dshg-filemeta" },
              entry.kind === "dir" ? "\u6587\u4EF6\u5939" : fmtSize(entry.size)
            ),
            h3("span", { className: "dshg-filetime" }, fmtTime(entry.mtime))
          )
        ) : null
      ),
      menu !== null ? h3(Menu, { x: menu.x, y: menu.y, items: menu.items, onClose: () => setMenu(null) }) : null
    ),
    h3("div", {
      className: "dshg-files-split",
      title: "\u62D6\u52A8\u8C03\u6574\u5BBD\u5EA6",
      onPointerDown: startDrag,
      onPointerMove: onDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag
    }),
    preview !== null ? h3(FilePreviewPane, {
      cwd,
      file: preview,
      onNotice,
      onClose: () => setPreview(null)
    }) : null
  );
}

// src/client/parts/Terminal.ts
var React8 = __toESM(require("react"), 1);
var h4 = React8.createElement;
var SUGGESTIONS = [
  "git status -sb",
  "git log --oneline --graph --all -20",
  "git stash list",
  "git diff --stat",
  "git branch -vv"
];
function Icon4(props) {
  return h4("svg", { viewBox: "0 0 16 16", "aria-hidden": "true" }, h4("path", { d: ICONS[props.name], fill: "currentColor" }));
}
function Terminal(props) {
  const { cwd, active } = props;
  const [entries, setEntries] = React8.useState([]);
  const [line, setLine] = React8.useState("");
  const [busy, setBusy] = React8.useState(false);
  const [runCwd, setRunCwd] = React8.useState(cwd);
  const [history, setHistory] = React8.useState([]);
  const [historyAt, setHistoryAt] = React8.useState(-1);
  const seq = React8.useRef(0);
  const scrollRef = React8.useRef(null);
  const inputRef = React8.useRef(null);
  React8.useEffect(() => {
    setEntries([
      { id: ++seq.current, kind: "notice", text: "\u4ED3\u5E93\u6839\u76EE\u5F55\u5DF2\u5C31\u7EEA\uFF0C\u8F93\u5165 git \u547D\u4EE4\u56DE\u8F66\u6267\u884C\uFF08\u2191\u2193 \u7FFB\u5386\u53F2\uFF0CCtrl+L \u6E05\u5C4F\uFF09\u3002" }
    ]);
    setRunCwd(cwd);
    setLine("");
    setHistory([]);
    setHistoryAt(-1);
  }, [cwd]);
  React8.useEffect(() => {
    if (!active) return;
    const node = scrollRef.current;
    if (node !== null) node.scrollTop = node.scrollHeight;
  }, [entries, active]);
  React8.useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);
  const submit = (raw) => {
    const command = (raw ?? line).trim();
    if (command === "" || busy) return;
    setLine("");
    setHistory((prev) => prev[prev.length - 1] === command ? prev : [...prev, command]);
    setHistoryAt(-1);
    setEntries((prev) => [...prev, { id: ++seq.current, kind: "input", text: command, cwd: runCwd }]);
    if (command === "clear" || command === "cls") {
      setEntries([]);
      return;
    }
    setBusy(true);
    api.terminal(runCwd, command).then((result) => {
      setRunCwd(result.cwd);
      setEntries((prev) => {
        const next = [...prev];
        if (result.output !== "") {
          next.push({ id: ++seq.current, kind: "output", text: result.output });
        }
        next.push({
          id: ++seq.current,
          kind: result.code === 0 ? "notice" : "error",
          text: result.code === null ? "\u5DF2\u4E2D\u6B62" : `\u9000\u51FA\u7801 ${result.code} \xB7 ${result.durationMs} ms \xB7 ${result.cwd}`,
          code: result.code,
          durationMs: result.durationMs,
          cwd: result.cwd
        });
        return next;
      });
    }).catch((error) => {
      setEntries((prev) => [
        ...prev,
        { id: ++seq.current, kind: "error", text: error instanceof Error ? error.message : String(error) }
      ]);
    }).finally(() => setBusy(false));
  };
  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (history.length === 0) return;
      const next = historyAt === -1 ? history.length - 1 : Math.max(0, historyAt - 1);
      setHistoryAt(next);
      setLine(history[next] ?? "");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyAt === -1) return;
      const next = historyAt + 1;
      if (next >= history.length) {
        setHistoryAt(-1);
        setLine("");
      } else {
        setHistoryAt(next);
        setLine(history[next] ?? "");
      }
      return;
    }
    if (event.ctrlKey && (event.key === "l" || event.key === "L")) {
      event.preventDefault();
      setEntries([]);
    }
  };
  return h4(
    "div",
    { className: "dshg-term" },
    h4(
      "div",
      { className: "dshg-term-bar" },
      h4(Icon4, { name: "terminal" }),
      h4("span", { className: "dshg-term-title" }, "Git \u7EC8\u7AEF"),
      h4("span", { className: "dshg-term-cwd", title: runCwd }, runCwd),
      h4("span", { className: "dshg-spacer" }),
      h4(
        "button",
        {
          type: "button",
          className: "dshg-mini",
          title: "\u6E05\u5C4F\uFF08Ctrl+L\uFF09",
          onClick: () => setEntries([])
        },
        h4(Icon4, { name: "close" })
      )
    ),
    h4(
      "div",
      { className: "dshg-term-log", ref: scrollRef, onClick: () => inputRef.current?.focus() },
      ...entries.map(
        (entry) => entry.kind === "input" ? h4(
          "div",
          { key: entry.id, className: "dshg-term-line dshg-term-input" },
          h4("span", { className: "dshg-term-prompt" }, "\u276F"),
          h4("span", { className: "dshg-term-cmd" }, entry.text)
        ) : h4(
          "pre",
          { key: entry.id, className: `dshg-term-line dshg-term-${entry.kind}` },
          entry.text
        )
      ),
      busy ? h4("div", { className: "dshg-term-line dshg-term-notice" }, "\u6267\u884C\u4E2D\u2026") : null
    ),
    h4(
      "div",
      { className: "dshg-term-suggest" },
      ...SUGGESTIONS.map(
        (suggestion) => h4(
          "button",
          {
            key: suggestion,
            type: "button",
            className: "dshg-chip",
            disabled: busy,
            onClick: () => submit(suggestion)
          },
          suggestion
        )
      )
    ),
    h4(
      "div",
      { className: "dshg-term-inputrow" },
      h4("span", { className: "dshg-term-prompt" }, "\u276F"),
      h4("input", {
        ref: inputRef,
        className: "dshg-term-field",
        value: line,
        spellCheck: false,
        autoComplete: "off",
        placeholder: busy ? "\u7B49\u5F85\u4E0A\u4E00\u6761\u547D\u4EE4\u7ED3\u675F\u2026" : "git status",
        disabled: busy,
        onChange: (event) => setLine(event.target.value),
        onKeyDown
      }),
      h4(
        "button",
        {
          type: "button",
          className: "dshg-primary dshg-term-run",
          disabled: busy || line.trim() === "",
          onClick: () => submit()
        },
        busy ? "\u6267\u884C\u4E2D\u2026" : "\u8FD0\u884C"
      )
    )
  );
}

// src/client/ScmPanel.ts
var STYLE_ID = "@wagq/dsh-git/scm.css";
var AUTO_REFRESH_MS = 2e4;
var LANE_W = 14;
var ROW_H = 26;
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "wagq-dsh-git";
  tag.dataset.pluginCss = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}
function removeStyles() {
  if (typeof document === "undefined") return;
  const tag = document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`);
  if (tag !== null) tag.remove();
}
function Icon5(props) {
  return React9.createElement(
    "svg",
    { viewBox: "0 0 16 16", "aria-hidden": "true", focusable: "false" },
    React9.createElement("path", { d: ICONS[props.name], fill: "currentColor" })
  );
}
function splitPath(raw) {
  const path = raw.replace(/\\/g, "/");
  const cut = path.lastIndexOf("/");
  if (cut === -1) return { dir: "", base: path };
  return { dir: path.slice(0, cut + 1), base: path.slice(cut + 1) };
}
function relativeTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const delta = Math.max(0, Math.floor(Date.now() / 1e3 - seconds));
  if (delta < 60) return "\u521A\u521A";
  if (delta < 3600) return `${Math.floor(delta / 60)} \u5206\u949F\u524D`;
  if (delta < 86400) return `${Math.floor(delta / 3600)} \u5C0F\u65F6\u524D`;
  if (delta < 86400 * 30) return `${Math.floor(delta / 86400)} \u5929\u524D`;
  const date = new Date(seconds * 1e3);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
function refKind(ref) {
  if (/^tag: /i.test(ref)) return "tag";
  if (/^[^/\s]+\/[^/\s]+$/.test(ref)) return "remote";
  return "branch";
}
function refLabel(ref) {
  return ref.replace(/^tag: /i, "").replace(/^origin\//, "");
}
async function copyText2(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
function GraphLanes(props) {
  const { row, lanes } = props;
  const width = Math.max(lanes, 1) * LANE_W;
  const cx = (lane) => lane * LANE_W + LANE_W / 2;
  const mid = ROW_H / 2;
  const children = [];
  for (const pass of row.passThrough) {
    children.push(
      React9.createElement("line", {
        key: `v${pass.lane}`,
        x1: cx(pass.lane),
        y1: 0,
        x2: cx(pass.lane),
        y2: ROW_H,
        stroke: pass.color,
        strokeWidth: 2,
        strokeLinecap: "round"
      })
    );
  }
  if (row.fromTop) {
    children.push(
      React9.createElement("line", {
        key: "up",
        x1: cx(row.lane),
        y1: 0,
        x2: cx(row.lane),
        y2: mid,
        stroke: row.color,
        strokeWidth: 2,
        strokeLinecap: "round"
      })
    );
  }
  if (row.toBottom) {
    children.push(
      React9.createElement("line", {
        key: "down",
        x1: cx(row.lane),
        y1: mid,
        x2: cx(row.lane),
        y2: ROW_H,
        stroke: row.color,
        strokeWidth: 2,
        strokeLinecap: "round"
      })
    );
  }
  for (const merge of row.merges) {
    if (merge.lane === row.lane) continue;
    const x1 = cx(row.lane);
    const x2 = cx(merge.lane);
    children.push(
      React9.createElement("path", {
        key: `m${merge.lane}`,
        d: `M ${x1} ${mid} C ${x1} ${mid + ROW_H / 3}, ${x2} ${ROW_H - ROW_H / 3}, ${x2} ${ROW_H}`,
        fill: "none",
        stroke: merge.color,
        strokeWidth: 2,
        strokeLinecap: "round"
      })
    );
  }
  children.push(
    React9.createElement("circle", {
      key: "node",
      cx: cx(row.lane),
      cy: mid,
      r: 4,
      fill: "var(--dsw-alias-bg-layer-1)",
      stroke: row.color,
      strokeWidth: 2
    })
  );
  return React9.createElement(
    "svg",
    { className: "dshg-gsvg", width, height: ROW_H, viewBox: `0 0 ${width} ${ROW_H}`, "aria-hidden": "true" },
    ...children
  );
}
function useRepoState(cwd, open) {
  const [state, setState] = React9.useState(null);
  const [loading, setLoading] = React9.useState(false);
  const [error, setError] = React9.useState("");
  const seq = React9.useRef(0);
  const load = React9.useCallback(
    (quiet) => {
      if (cwd === "") return;
      const mine = ++seq.current;
      if (!quiet) setLoading(true);
      api.state(cwd, 120).then((next) => {
        if (mine !== seq.current) return;
        setState(next);
        setError("");
      }).catch((err) => {
        if (mine !== seq.current) return;
        setState(null);
        setError(err instanceof ApiError && err.detail !== "" ? err.message : err instanceof Error ? err.message : String(err));
      }).finally(() => {
        if (mine === seq.current) setLoading(false);
      });
    },
    [cwd]
  );
  React9.useEffect(() => {
    load(false);
  }, [load]);
  React9.useEffect(() => {
    if (!open) return void 0;
    const timer = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [open, load]);
  return { state, loading, error, refresh: load };
}
function BranchPicker(props) {
  const { cwd, current, onClose, onSwitched, x, y } = props;
  const [list, setList] = React9.useState(null);
  const [error, setError] = React9.useState("");
  const [filter, setFilter] = React9.useState("");
  const [newName, setNewName] = React9.useState("");
  React9.useEffect(() => {
    let alive = true;
    api.branches(cwd).then((result) => {
      if (alive) setList(result.branches);
    }).catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      alive = false;
    };
  }, [cwd]);
  const switchTo = (name2) => {
    api.checkout(cwd, name2).then(() => {
      onSwitched();
      onClose();
    }).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  };
  const filtered = (list ?? []).filter((branch) => filter === "" || branch.name.toLowerCase().includes(filter.toLowerCase()));
  const local = filtered.filter((branch) => !branch.remote);
  const remote = filtered.filter((branch) => branch.remote);
  return React9.createElement(
    "div",
    {
      className: "dshg-menu dshg-branchpicker",
      style: { left: Math.max(8, x - 260), top: y + 6, width: 300 },
      role: "dialog",
      "aria-label": "\u5207\u6362\u5206\u652F"
    },
    React9.createElement("div", { className: "dshg-menu-head" }, "\u5207\u6362\u5206\u652F / \u6807\u7B7E"),
    React9.createElement("input", {
      className: "dshg-input",
      placeholder: "\u7B5B\u9009\u5206\u652F\u540D\u2026",
      value: filter,
      autoFocus: true,
      spellCheck: false,
      onChange: (event) => setFilter(event.target.value),
      onKeyDown: (event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "Enter") {
          const first = filtered[0];
          if (first !== void 0 && !first.current) switchTo(first.name);
        }
      }
    }),
    error !== "" ? React9.createElement("div", { className: "dshg-err" }, error) : null,
    list === null ? React9.createElement("div", { className: "dshg-loading" }, "\u8BFB\u53D6\u5206\u652F\u2026") : React9.createElement(
      "div",
      { className: "dshg-menu-scroll" },
      local.length > 0 ? React9.createElement("div", { className: "dshg-menu-head" }, "\u672C\u5730") : null,
      ...local.map(
        (branch) => React9.createElement(
          "button",
          {
            key: `l:${branch.name}`,
            type: "button",
            className: `dshg-menu-item${branch.current ? " dshg-menu-current" : ""}`,
            disabled: branch.current,
            title: branch.subject,
            onClick: () => switchTo(branch.name)
          },
          React9.createElement("span", { className: "dshg-menu-icon" }, branch.current ? React9.createElement(Icon5, { name: "check" }) : null),
          React9.createElement("span", { className: "dshg-menu-label" }, branch.name),
          branch.ahead > 0 || branch.behind > 0 ? React9.createElement("span", { className: "dshg-menu-hint" }, `\u2191${branch.ahead} \u2193${branch.behind}`) : React9.createElement("span", { className: "dshg-menu-hint" }, branch.sha)
        )
      ),
      remote.length > 0 ? React9.createElement("div", { className: "dshg-menu-head" }, "\u8FDC\u7A0B") : null,
      ...remote.map(
        (branch) => React9.createElement(
          "button",
          {
            key: `r:${branch.name}`,
            type: "button",
            className: "dshg-menu-item",
            title: branch.subject,
            onClick: () => {
              const localName = branch.name.replace(/^[^/]+\//, "");
              api.checkout(cwd, localName, true).then(() => {
                onSwitched();
                onClose();
              }).catch(() => {
                switchTo(branch.name);
              });
            }
          },
          React9.createElement("span", { className: "dshg-menu-icon" }, null),
          React9.createElement("span", { className: "dshg-menu-label" }, branch.name),
          React9.createElement("span", { className: "dshg-menu-hint" }, branch.sha)
        )
      )
    ),
    React9.createElement(
      "div",
      { className: "dshg-branchnew" },
      React9.createElement("input", {
        className: "dshg-input",
        placeholder: "\u65B0\u5206\u652F\u540D\uFF08\u4ECE\u5F53\u524D HEAD \u521B\u5EFA\uFF09",
        value: newName,
        spellCheck: false,
        onChange: (event) => setNewName(event.target.value),
        onKeyDown: (event) => {
          if (event.key === "Enter" && newName.trim() !== "") {
            api.checkout(cwd, newName.trim(), true).then(() => {
              onSwitched();
              onClose();
            }).catch((err) => setError(err instanceof Error ? err.message : String(err)));
          }
        }
      })
    )
  );
}
function CompareView(props) {
  const { cwd, onClose, onPick } = props;
  const [data, setData] = React9.useState(null);
  const [error, setError] = React9.useState("");
  const [loading, setLoading] = React9.useState(true);
  const load = React9.useCallback(() => {
    setLoading(true);
    setError("");
    api.compare(cwd, 60).then((result) => setData(result)).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setLoading(false));
  }, [cwd]);
  React9.useEffect(load, [load]);
  const group = (title, hint, list, tone) => React9.createElement(
    "div",
    { className: "dshg-cmp-group" },
    React9.createElement(
      "div",
      { className: "dshg-sechead dshg-static" },
      React9.createElement("span", { className: `dshg-cmp-arrow dshg-cmp-${tone}` }, tone === "in" ? "\u2193" : "\u2191"),
      React9.createElement("span", { className: "dshg-sectitle" }, title),
      React9.createElement("span", { className: "dshg-count" }, list.length),
      React9.createElement(
        "span",
        { className: "dshg-secactions" },
        React9.createElement("span", { className: "dshg-gsha" }, hint)
      )
    ),
    list.length === 0 ? React9.createElement("div", { className: "dshg-cmp-empty" }, "\u6CA1\u6709\u63D0\u4EA4") : React9.createElement(
      "div",
      null,
      ...list.map(
        (side) => React9.createElement(
          "div",
          {
            key: side.sha,
            className: "dshg-cmp-row",
            role: "button",
            tabIndex: 0,
            title: `${side.sha}
${side.author}
${side.subject}`,
            onClick: () => onPick(side.sha),
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPick(side.sha);
              }
            }
          },
          React9.createElement("span", { className: "dshg-cmp-subject" }, side.subject === "" ? "(no message)" : side.subject),
          React9.createElement(
            "span",
            { className: "dshg-gside" },
            React9.createElement("span", { className: "dshg-gsha" }, side.short),
            React9.createElement("span", null, relativeTime(side.time))
          )
        )
      )
    )
  );
  return React9.createElement(
    "div",
    { className: "dshg-diff dshg-compare" },
    React9.createElement(
      "div",
      { className: "dshg-diffhead" },
      React9.createElement(Icon5, { name: "sync" }),
      React9.createElement(
        "span",
        { className: "dshg-diffpath" },
        data === null || data.upstream === "" ? "\u4E0E\u8FDC\u7A0B\u5BF9\u6BD4" : `\u4E0E ${data.upstream} \u5BF9\u6BD4`
      ),
      React9.createElement("span", { className: "dshg-spacer" }),
      React9.createElement(
        "button",
        { type: "button", className: "dshg-mini", title: "\u5237\u65B0\u5BF9\u6BD4", onClick: load },
        React9.createElement(Icon5, { name: "refresh" })
      ),
      React9.createElement(
        "button",
        { type: "button", className: "dshg-mini", title: "\u5173\u95ED\uFF08Esc\uFF09", onClick: onClose },
        React9.createElement(Icon5, { name: "close" })
      )
    ),
    React9.createElement(
      "div",
      { className: "dshg-diffbody dshg-cmp-body" },
      loading ? React9.createElement("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u5BF9\u6BD4\u8FDC\u7A0B\u2026") : null,
      !loading && error !== "" ? React9.createElement("div", { className: "dshg-diffempty" }, error) : null,
      !loading && error === "" && data !== null && data.upstream === "" ? React9.createElement(
        "div",
        { className: "dshg-diffempty" },
        "\u5F53\u524D\u5206\u652F\u6CA1\u6709\u4E0A\u6E38\u5206\u652F\uFF0C\u65E0\u6CD5\u5BF9\u6BD4\u3002\u5148\u63A8\u9001\u4E00\u6B21\uFF08\u4F1A\u5EFA\u7ACB\u4E0A\u6E38\uFF09\u518D\u56DE\u6765\u770B\u3002"
      ) : null,
      !loading && data !== null && data.upstream !== "" ? React9.createElement(
        React9.Fragment,
        null,
        group("\u843D\u540E\uFF08\u8FDC\u7AEF\u6709\u3001\u672C\u5730\u6CA1\u6709\uFF09", data.upstream, data.behind, "in"),
        group("\u9886\u5148\uFF08\u672C\u5730\u6709\u3001\u8FDC\u7AEF\u6CA1\u6709\uFF09", "HEAD", data.ahead, "out")
      ) : null
    )
  );
}
function Popup(props) {
  const { cwd, sessionId, anchor, onClose } = props;
  const repo = useRepoState(cwd, true);
  const state = repo.state;
  const [tab, setTab] = React9.useState("changes");
  const [message, setMessage] = React9.useState("");
  const [amend, setAmend] = React9.useState(false);
  const [signoff, setSignoff] = React9.useState(false);
  const [busy, setBusy] = React9.useState("");
  const [notice, setNotice] = React9.useState("");
  const [failure, setFailure] = React9.useState("");
  const [selected, setSelected] = React9.useState(null);
  const [open, setOpen] = React9.useState({ staged: true, changes: true, untracked: true });
  const [menu, setMenu] = React9.useState(null);
  const [branchPicker, setBranchPicker] = React9.useState(null);
  const menuAnchor = React9.useRef(null);
  const showMenu = (items, at) => {
    setBranchPicker(null);
    const anchor2 = at ?? menuAnchor.current ?? { x: window.innerWidth - 230, y: 96 };
    menuAnchor.current = anchor2;
    setMenu({ x: anchor2.x, y: anchor2.y, items });
  };
  const showBranchPicker = (at) => {
    setMenu(null);
    setBranchPicker(at);
  };
  const [commitSha, setCommitSha] = React9.useState("");
  const [detail, setDetail] = React9.useState(null);
  const [confirm, setConfirm] = React9.useState(null);
  const [compareOpen, setCompareOpen] = React9.useState(false);
  const [diffSplit, setDiffSplit] = React9.useState(true);
  const [conflictFile, setConflictFile] = React9.useState("");
  const [historyPath, setHistoryPath] = React9.useState("");
  const [historyCommits, setHistoryCommits] = React9.useState(null);
  const messageRef = React9.useRef(null);
  const stagedCount = state?.staged.length ?? 0;
  React9.useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (menu !== null || branchPicker !== null || confirm !== null) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, menu, branchPicker, confirm]);
  React9.useEffect(() => {
    setSelected(null);
    setMessage("");
    setAmend(false);
    setNotice("");
    setFailure("");
    setCommitSha("");
    setCompareOpen(false);
    setConflictFile("");
    setHistoryPath("");
    setHistoryCommits(null);
    setTab("changes");
  }, [cwd]);
  const run = (label, task, after) => {
    setBusy(label);
    setFailure("");
    setNotice("");
    task().then(() => {
      repo.refresh(true);
      after?.();
    }).catch((err) => {
      const detailText = err instanceof ApiError ? err.detail : "";
      setFailure(detailText !== "" ? detailText : err instanceof Error ? err.message : String(err));
    }).finally(() => setBusy(""));
  };
  const notify = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice((prev) => prev === text ? "" : prev), 4e3);
  };
  const doSync = (action) => {
    run(
      action,
      () => api.sync(cwd, action, { setUpstream: action === "push" }).then((result) => {
        notify(result.summary);
        if (action === "pull" || action === "push") repo.refresh(true);
      })
    );
  };
  const doCommit = () => {
    if (message.trim() === "") {
      messageRef.current?.focus();
      return;
    }
    run("commit", async () => {
      const result = await api.commit(cwd, message.trim(), amend, signoff);
      setMessage("");
      setAmend(false);
      setSignoff(false);
      notify(`\u5DF2\u63D0\u4EA4 ${result.short}${result.branch === "" ? "" : ` \xB7 ${result.branch}`}`);
    });
  };
  const doGenerate = () => {
    run("generate", async () => {
      const result = await api.generateMessage(cwd, sessionId);
      setMessage(result.message);
      messageRef.current?.focus();
      notify(`\u7531 ${result.model} \u751F\u6210`);
    });
  };
  const doManualRefresh = () => {
    repo.refresh(false);
  };
  const openMainMenu = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const behind2 = state?.repo.behind ?? 0;
    const ahead2 = state?.repo.ahead ?? 0;
    menuAnchor.current = { x: rect.right - 214, y: rect.bottom + 4 };
    showMenu([
      { id: "h1", label: "\u540C\u6B65", heading: true },
      {
        id: "pull",
        label: "\u62C9\u53D6\uFF08Pull\uFF09",
        icon: React9.createElement(Icon5, { name: "download" }),
        hint: behind2 > 0 ? `\u843D\u540E ${behind2}` : void 0,
        onSelect: () => doSync("pull")
      },
      {
        id: "push",
        label: "\u63A8\u9001\uFF08Push\uFF09",
        icon: React9.createElement(Icon5, { name: "upload" }),
        hint: ahead2 > 0 ? `\u9886\u5148 ${ahead2}` : void 0,
        onSelect: () => {
          if (ahead2 === 0) {
          }
          doSync("push");
        }
      },
      {
        id: "fetch",
        label: "\u6293\u53D6\uFF08Fetch\uFF09",
        icon: React9.createElement(Icon5, { name: "sync" }),
        onSelect: () => doSync("fetch")
      },
      { id: "h2", label: "\u5206\u652F\u4E0E\u8FDC\u7AEF", heading: true, separated: true },
      {
        id: "switch",
        label: "\u5207\u6362\u5206\u652F\u2026",
        icon: React9.createElement(Icon5, { name: "branch" }),
        onSelect: () => showBranchPicker({ x: rect.right, y: rect.bottom })
      },
      {
        id: "stage",
        label: "\u6682\u5B58\u5168\u90E8\u66F4\u6539",
        icon: React9.createElement(Icon5, { name: "plus" }),
        disabled: state === null || state.changes.length + state.untracked.length === 0,
        onSelect: () => {
          if (state === null) return;
          const paths = [...state.changes, ...state.untracked].map((entry) => entry.path);
          run("stage", () => api.stage(cwd, paths));
        }
      },
      { id: "remotes", label: "\u8FDC\u7A0B\u7BA1\u7406\u2026", icon: React9.createElement(Icon5, { name: "repo" }), onSelect: openRemotesMenu },
      { id: "h3", label: "\u5176\u5B83", heading: true, separated: true },
      { id: "terminal", label: "\u6253\u5F00 Git \u7EC8\u7AEF", icon: React9.createElement(Icon5, { name: "terminal" }), onSelect: () => setTab("terminal") },
      { id: "refresh", label: "\u5237\u65B0", icon: React9.createElement(Icon5, { name: "refresh" }), onSelect: doManualRefresh }
    ]);
  };
  const openRemotesMenu = () => {
    api.remotes(cwd).then((result) => {
      const items = [{ id: "rh", label: "\u8FDC\u7A0B", heading: true }];
      for (const remote of result.remotes) {
        items.push({
          id: `r:${remote.name}`,
          label: remote.name,
          hint: shortenUrl(remote.url),
          onSelect: () => openRemoteEdit(remote)
        });
      }
      if (result.remotes.length === 0) {
        items.push({ id: "none", label: "\u8FD8\u6CA1\u6709\u914D\u7F6E\u8FDC\u7AEF", disabled: true });
      }
      items.push({
        id: "add",
        label: "\u6DFB\u52A0\u8FDC\u7AEF\u2026",
        separated: true,
        icon: React9.createElement(Icon5, { name: "plus" }),
        onSelect: () => addRemoteFlow()
      });
      showMenu(items);
    }).catch((err) => setFailure(err instanceof Error ? err.message : String(err)));
  };
  const shortenUrl = (url) => {
    const clean = url.replace(/\.git$/, "");
    return clean.length > 28 ? `\u2026${clean.slice(-27)}` : clean;
  };
  const openRemoteEdit = (remote) => {
    showMenu([
      { id: "h", label: remote.name, heading: true },
      {
        id: "copy",
        label: "\u590D\u5236\u8FDC\u7AEF\u5730\u5740",
        onSelect: () => {
          void copyText2(remote.url).then((ok) => notify(ok ? "\u5DF2\u590D\u5236\u8FDC\u7AEF\u5730\u5740" : "\u590D\u5236\u5931\u8D25"));
        }
      },
      {
        id: "url",
        label: "\u4FEE\u6539\u5730\u5740\u2026",
        onSelect: () => setConfirm({
          title: `\u4FEE\u6539 ${remote.name} \u7684\u5730\u5740`,
          body: "\u586B\u65B0\u7684 URL \u540E\u4FDD\u5B58\uFF1Bclone / fetch / push \u90FD\u4F1A\u6539\u7528\u8FD9\u4E2A\u5730\u5740\u3002",
          fields: [{ name: "url", label: "\u8FDC\u7AEF URL", value: remote.url, placeholder: "https://\u2026 \u6216 git@\u2026" }],
          okLabel: "\u4FDD\u5B58",
          run: (values) => {
            const next = (values.url ?? "").trim();
            if (next === "" || next === remote.url) return;
            run("remote", () => api.setRemoteUrl(cwd, remote.name, next));
          }
        })
      },
      {
        id: "remove",
        label: `\u5220\u9664\u8FDC\u7AEF ${remote.name}`,
        danger: true,
        separated: true,
        onSelect: () => setConfirm({
          title: `\u5220\u9664\u8FDC\u7AEF ${remote.name}`,
          body: "\u8FD9\u4F1A\u79FB\u9664\u672C\u5730\u5BF9\u5B83\u7684\u914D\u7F6E\uFF0C\u4E0D\u4F1A\u5F71\u54CD\u8FDC\u7AEF\u670D\u52A1\u5668\u4E0A\u7684\u4ED3\u5E93\u3002",
          danger: true,
          okLabel: "\u5220\u9664",
          run: () => run("remote", () => api.removeRemote(cwd, remote.name))
        })
      }
    ]);
  };
  const addRemoteFlow = () => {
    setConfirm({
      title: "\u6DFB\u52A0\u8FDC\u7AEF",
      body: "\u52A0\u597D\u540E\u5C31\u53EF\u4EE5\u62C9\u53D6\u548C\u63A8\u9001\u4E86\u3002\u540D\u79F0\u901A\u5E38\u662F origin\u3001upstream \u4E4B\u7C7B\u7684\u77ED\u540D\u5B57\u3002",
      fields: [
        { name: "name", label: "\u540D\u79F0", value: "origin", placeholder: "origin" },
        { name: "url", label: "URL", value: "", placeholder: "https://\u2026 \u6216 git@\u2026" }
      ],
      okLabel: "\u6DFB\u52A0",
      run: (values) => {
        const name2 = (values.name ?? "").trim();
        const url = (values.url ?? "").trim();
        if (name2 === "" || url === "") return;
        run("remote", () => api.addRemote(cwd, name2, url));
      }
    });
  };
  const openCommitMenu = (event, commit) => {
    event.preventDefault();
    event.stopPropagation();
    const behind2 = commit.sha !== state?.repo.head;
    showMenu([
      { id: "h", label: `${commit.short} \xB7 ${commit.subject.slice(0, 28)}`, heading: true },
      {
        id: "copy-sha",
        label: "\u590D\u5236\u63D0\u4EA4\u54C8\u5E0C",
        hint: "SHA",
        onSelect: () => {
          void copyText2(commit.sha).then((ok) => notify(ok ? "\u5DF2\u590D\u5236\u54C8\u5E0C" : "\u590D\u5236\u5931\u8D25"));
        }
      },
      {
        id: "copy-msg",
        label: "\u590D\u5236\u63D0\u4EA4\u6D88\u606F",
        hint: "message",
        onSelect: () => {
          void copyText2(commit.subject).then((ok) => notify(ok ? "\u5DF2\u590D\u5236\u63D0\u4EA4\u6D88\u606F" : "\u590D\u5236\u5931\u8D25"));
        }
      },
      {
        id: "revert",
        label: "\u6062\u590D\u81F3\u5F53\u524D\u63D0\u4EA4\uFF08\u751F\u6210\u53CD\u5411\u63D0\u4EA4\uFF09",
        separated: true,
        onSelect: () => run(
          "commit-action",
          () => api.commitAction(cwd, commit.sha, "revert").then((result) => notify(result.summary))
        )
      },
      { id: "h2", label: "\u91CD\u7F6E\uFF08reset\uFF09", heading: true },
      {
        id: "reset-soft",
        label: "\u8F6F\u91CD\u7F6E\u5230\u6B64\u63D0\u4EA4",
        hint: "\u4FDD\u7559\u6682\u5B58",
        onSelect: () => runReset(commit, "reset-soft")
      },
      {
        id: "reset-mixed",
        label: "\u6DF7\u5408\u91CD\u7F6E\u5230\u6B64\u63D0\u4EA4",
        hint: "\u4FDD\u7559\u5DE5\u4F5C\u533A",
        onSelect: () => runReset(commit, "reset-mixed")
      },
      {
        id: "reset-hard",
        label: "\u786C\u91CD\u7F6E\u5230\u6B64\u63D0\u4EA4",
        hint: "\u4E22\u5F03\u6539\u52A8",
        danger: true,
        onSelect: () => runReset(commit, "reset-hard")
      },
      {
        id: "rebase",
        label: "rebase \u5230\u6B64\u63D0\u4EA4",
        separated: true,
        danger: true,
        disabled: !behind2,
        onSelect: () => setConfirm({
          title: `rebase \u5230 ${commit.short}`,
          body: "\u5F53\u524D\u5206\u652F\u7684\u63D0\u4EA4\u4F1A\u88AB\u91CD\u653E\u5230\u8FD9\u4E2A\u63D0\u4EA4\u4E4B\u4E0A\uFF0C\u5386\u53F2\u4F1A\u88AB\u6539\u5199\uFF08\u5DF2\u63A8\u9001\u7684\u63D0\u4EA4\u9700\u8981\u5F3A\u63A8\uFF09\u3002",
          danger: true,
          run: () => run(
            "commit-action",
            () => api.commitAction(cwd, commit.sha, "rebase").then((result) => notify(result.summary))
          )
        })
      }
    ], { x: event.clientX, y: event.clientY });
  };
  const runReset = (commit, action) => {
    const label = action === "reset-soft" ? "\u8F6F\u91CD\u7F6E" : action === "reset-mixed" ? "\u6DF7\u5408\u91CD\u7F6E" : "\u786C\u91CD\u7F6E";
    const body = action === "reset-hard" ? `\u5DE5\u4F5C\u533A\u548C\u6682\u5B58\u533A\u7684\u6539\u52A8\u4F1A\u5168\u90E8\u4E22\u5F03\uFF0CHEAD \u4F1A\u79FB\u52A8\u5230 ${commit.short}\u3002\u8FD9\u4E2A\u64CD\u4F5C\u4E0D\u80FD\u64A4\u9500\u3002` : action === "reset-mixed" ? `HEAD \u4F1A\u79FB\u52A8\u5230 ${commit.short}\uFF0C\u4E4B\u540E\u7684\u63D0\u4EA4\u53D6\u6D88\u6682\u5B58\u4F46\u5185\u5BB9\u7559\u5728\u5DE5\u4F5C\u533A\u3002` : `HEAD \u4F1A\u79FB\u52A8\u5230 ${commit.short}\uFF0C\u4E4B\u540E\u7684\u63D0\u4EA4\u5185\u5BB9\u5168\u90E8\u8FDB\u5165\u6682\u5B58\u533A\u3002`;
    setConfirm({
      title: `${label}\u5230 ${commit.short}`,
      body,
      danger: true,
      okLabel: "\u786E\u8BA4\u6267\u884C",
      run: () => run("commit-action", () => api.commitAction(cwd, commit.sha, action).then((result) => notify(result.summary)))
    });
  };
  const rowView = (entry) => {
    const { dir, base } = splitPath(entry.path);
    const isStaged = entry.kind === "staged";
    const isConflict = entry.kind === "conflicted";
    const active = selected !== null && selected.path === entry.path && selected.kind === entry.kind;
    const stat = state?.stats?.[entry.path];
    const changed = stat === void 0 ? 0 : stat.added + stat.removed;
    const open2 = () => {
      if (isConflict) setConflictFile(entry.path);
      else {
        setConflictFile("");
        setSelected(entry);
      }
    };
    return React9.createElement(
      "div",
      {
        key: `${entry.kind}:${entry.path}:${entry.from}`,
        className: `dshg-row${isConflict ? " dshg-row-conflict" : ""}`,
        role: "button",
        tabIndex: 0,
        "data-active": active,
        title: isConflict ? `${entry.path}\uFF08\u70B9\u51FB\u89E3\u51B3\u51B2\u7A81\uFF09` : entry.from === "" ? entry.path : `${entry.from} \u2192 ${entry.path}`,
        onClick: open2,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open2();
          }
        }
      },
      React9.createElement(
        "span",
        { className: "dshg-rowname" },
        dir === "" ? null : React9.createElement("span", { className: "dshg-rowdir" }, dir),
        base
      ),
      React9.createElement(
        "span",
        { className: "dshg-rowdeco" },
        stat !== void 0 && changed > 0 ? React9.createElement(
          "span",
          { className: "dshg-rowstat" },
          React9.createElement("span", { className: "dshg-add" }, `+${stat.added}`),
          React9.createElement("span", { className: "dshg-del" }, `\u2212${stat.removed}`)
        ) : null,
        React9.createElement("span", { className: `dshg-rowletter dshg-letter-${entry.letter}` }, entry.letter)
      ),
      React9.createElement(
        "span",
        { className: "dshg-rowbtns" },
        isStaged ? React9.createElement(
          "button",
          {
            type: "button",
            className: "dshg-mini",
            title: "\u53D6\u6D88\u6682\u5B58",
            onClick: (event) => {
              event.stopPropagation();
              run("unstage", () => api.unstage(cwd, [entry.path]));
            }
          },
          React9.createElement(Icon5, { name: "minus" })
        ) : React9.createElement(
          "button",
          {
            type: "button",
            className: "dshg-mini",
            title: "\u6682\u5B58\u66F4\u6539",
            onClick: (event) => {
              event.stopPropagation();
              run("stage", () => api.stage(cwd, [entry.path]));
            }
          },
          React9.createElement(Icon5, { name: "plus" })
        ),
        isStaged ? null : React9.createElement(
          "button",
          {
            type: "button",
            className: "dshg-mini",
            title: entry.kind === "untracked" ? "\u5220\u9664\u6587\u4EF6" : "\u653E\u5F03\u66F4\u6539",
            onClick: (event) => {
              event.stopPropagation();
              run("discard", () => api.discard(cwd, [entry.path]));
            }
          },
          React9.createElement(Icon5, { name: "undo" })
        )
      )
    );
  };
  const section = (key, title, entries, actions) => {
    if (entries.length === 0) return null;
    const isOpen = open[key];
    const toggle = () => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
    return React9.createElement(
      "div",
      { className: "dshg-section", key },
      React9.createElement(
        "div",
        {
          className: "dshg-sechead",
          role: "button",
          tabIndex: 0,
          onClick: toggle,
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggle();
            }
          }
        },
        React9.createElement("span", { className: "dshg-caret", "data-open": isOpen }, React9.createElement(Icon5, { name: "chevron" })),
        React9.createElement("span", { className: "dshg-sectitle" }, title),
        React9.createElement("span", { className: "dshg-count" }, entries.length),
        React9.createElement("span", { className: "dshg-secactions" }, actions)
      ),
      isOpen ? React9.createElement("div", null, ...entries.map(rowView)) : null
    );
  };
  const [diffPayload, setDiffPayload] = React9.useState(null);
  const [diffError, setDiffError] = React9.useState("");
  const [diffLoading, setDiffLoading] = React9.useState(false);
  React9.useEffect(() => {
    if (selected === null) {
      setDiffPayload(null);
      setDiffError("");
      return void 0;
    }
    let alive = true;
    setDiffLoading(true);
    setDiffError("");
    setDiffPayload(null);
    api.diff(cwd, selected.path, selected.kind === "staged", selected.from).then((next) => {
      if (alive) setDiffPayload(next);
    }).catch((err) => {
      if (alive) setDiffError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (alive) setDiffLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [cwd, selected]);
  React9.useEffect(() => {
    if (historyPath === "") {
      setHistoryCommits(null);
      return void 0;
    }
    let alive = true;
    api.fileHistory(cwd, historyPath).then((result) => {
      if (alive) setHistoryCommits(result.commits);
    }).catch(() => {
      if (alive) setHistoryCommits([]);
    });
    return () => {
      alive = false;
    };
  }, [cwd, historyPath]);
  const showFileHistory = (rel) => {
    setHistoryPath(rel);
    setHistoryCommits(null);
    setCommitSha("");
    setCompareOpen(false);
    setConflictFile("");
    setTab("graph");
  };
  React9.useEffect(() => {
    if (commitSha === "") {
      setDetail(null);
      return void 0;
    }
    let alive = true;
    api.commitDetail(cwd, commitSha).then((result) => {
      if (alive) setDetail(result.commit);
    }).catch(() => {
      if (alive) setDetail(null);
    });
    return () => {
      alive = false;
    };
  }, [cwd, commitSha]);
  const graphCommits = historyPath !== "" && historyCommits !== null ? historyCommits : state?.commits ?? [];
  const graphRows = layoutGraph(graphCommits);
  const laneTotal = graphRows.reduce((max, row) => Math.max(max, row.laneCount), 1);
  const commitBySha = /* @__PURE__ */ new Map();
  for (const commit of graphCommits) commitBySha.set(commit.sha, commit);
  const clickCommit = (commit) => {
    setCommitSha((prev) => prev === commit.sha ? "" : commit.sha);
  };
  const position = () => {
    const needsSide = compareOpen || tab === "graph" && commitSha !== "" || tab === "changes" && selected !== null || conflictFile !== "";
    const isFiles = tab === "files";
    const preferred = needsSide || isFiles ? Math.max(1080, Math.round(window.innerWidth * 0.9)) : 480;
    const width = Math.min(preferred, Math.max(320, window.innerWidth - 24));
    if (anchor === null || typeof window === "undefined") return { top: 64, right: 16, width };
    const right = Math.max(12, Math.min(window.innerWidth - width - 12, window.innerWidth - anchor.right));
    const top = Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - 320));
    return { top, right, width };
  };
  const banner = failure !== "" ? React9.createElement(
    "div",
    { className: "dshg-err" },
    failure,
    React9.createElement(
      "button",
      { type: "button", className: "dshg-err-close", onClick: () => setFailure("") },
      "\xD7"
    )
  ) : repo.error !== "" ? React9.createElement("div", { className: "dshg-err" }, repo.error) : null;
  const tabButton = (id, label, count) => React9.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": tab === id,
      className: `dshg-tab${tab === id ? " dshg-tab-on" : ""}`,
      onClick: () => setTab(id)
    },
    label,
    count === void 0 ? null : React9.createElement("span", { className: "dshg-count" }, count)
  );
  const behind = state?.repo.behind ?? 0;
  const ahead = state?.repo.ahead ?? 0;
  const conflicts = state?.changes.filter((entry) => entry.kind === "conflicted") ?? [];
  const bodyForTab = () => {
    if (tab === "terminal") return React9.createElement(Terminal, { cwd, active: tab === "terminal" });
    if (tab === "files") {
      return React9.createElement(FileBrowser, {
        cwd,
        active: tab === "files",
        onHistory: showFileHistory,
        onNotice: notify
      });
    }
    if (repo.loading && state === null) return React9.createElement("div", { className: "dshg-loading" }, "\u6B63\u5728\u8BFB\u53D6\u4ED3\u5E93\u2026");
    if (tab === "changes") {
      if (state === null) return null;
      const clean = state.staged.length + state.changes.length + state.untracked.length === 0;
      const list = React9.createElement(
        "div",
        { className: "dshg-list" },
        clean ? React9.createElement(
          "div",
          { className: "dshg-empty" },
          React9.createElement(Icon5, { name: "check" }),
          React9.createElement("div", { className: "dshg-empty-title" }, "\u6CA1\u6709\u66F4\u6539"),
          React9.createElement(
            "div",
            { className: "dshg-empty-body" },
            state.repo.empty ? "\u8FD9\u4E2A\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002" : "\u5DE5\u4F5C\u533A\u662F\u5E72\u51C0\u7684\u3002"
          )
        ) : null,
        conflicts.length > 0 ? React9.createElement(
          "div",
          { className: "dshg-section dshg-conflict-group" },
          React9.createElement(
            "div",
            { className: "dshg-sechead dshg-static" },
            React9.createElement(Icon5, { name: "warning" }),
            React9.createElement("span", { className: "dshg-sectitle" }, "\u5408\u5E76\u51B2\u7A81"),
            React9.createElement("span", { className: "dshg-count" }, conflicts.length)
          ),
          ...conflicts.map(rowView)
        ) : null,
        section(
          "staged",
          "\u6682\u5B58\u7684\u66F4\u6539",
          state.staged,
          state.staged.length > 0 ? React9.createElement(
            "button",
            {
              type: "button",
              className: "dshg-mini",
              title: "\u5168\u90E8\u53D6\u6D88\u6682\u5B58",
              onClick: (event) => {
                event.stopPropagation();
                run("unstage", () => api.unstage(cwd, state.staged.map((entry) => entry.path)));
              }
            },
            React9.createElement(Icon5, { name: "minus" })
          ) : null
        ),
        section(
          "changes",
          "\u66F4\u6539",
          state.changes,
          state.changes.length > 0 ? React9.createElement(
            React9.Fragment,
            null,
            React9.createElement(
              "button",
              {
                type: "button",
                className: "dshg-mini",
                title: "\u653E\u5F03\u5168\u90E8\u66F4\u6539",
                onClick: (event) => {
                  event.stopPropagation();
                  run("discard", () => api.discard(cwd, state.changes.map((entry) => entry.path)));
                }
              },
              React9.createElement(Icon5, { name: "undo" })
            ),
            React9.createElement(
              "button",
              {
                type: "button",
                className: "dshg-mini",
                title: "\u5168\u90E8\u6682\u5B58",
                onClick: (event) => {
                  event.stopPropagation();
                  run("stage", () => api.stage(cwd, state.changes.map((entry) => entry.path)));
                }
              },
              React9.createElement(Icon5, { name: "plus" })
            )
          ) : null
        ),
        section(
          "untracked",
          "\u672A\u8DDF\u8E2A",
          state.untracked,
          state.untracked.length > 0 ? React9.createElement(
            "button",
            {
              type: "button",
              className: "dshg-mini",
              title: "\u6682\u5B58\u5168\u90E8\u672A\u8DDF\u8E2A\u6587\u4EF6",
              onClick: (event) => {
                event.stopPropagation();
                run("stage", () => api.stage(cwd, state.untracked.map((entry) => entry.path)));
              }
            },
            React9.createElement(Icon5, { name: "plus" })
          ) : null
        )
      );
      const diffPanel = selected === null ? null : React9.createElement(
        "div",
        { className: "dshg-diff" },
        React9.createElement(
          "div",
          { className: "dshg-diffhead" },
          React9.createElement(Icon5, { name: "file" }),
          React9.createElement("span", { className: "dshg-diffpath", title: selected.path }, selected.path),
          diffPayload !== null && !diffPayload.binary ? React9.createElement(
            "span",
            { className: "dshg-rowstat" },
            React9.createElement("span", { className: "dshg-add" }, `+${diffPayload.added}`),
            React9.createElement("span", { className: "dshg-del" }, `\u2212${diffPayload.removed}`)
          ) : null,
          React9.createElement("span", { className: "dshg-spacer" }),
          React9.createElement(
            "button",
            {
              type: "button",
              className: "dshg-mini",
              title: diffSplit ? "\u5207\u6362\u4E3A\u884C\u5185\u89C6\u56FE" : "\u5207\u6362\u4E3A\u5E76\u6392\u89C6\u56FE",
              "aria-pressed": diffSplit,
              onClick: () => setDiffSplit((prev) => !prev)
            },
            React9.createElement("span", { className: "dshg-viewtoggle" }, diffSplit ? "\u5E76\u6392" : "\u884C\u5185")
          ),
          React9.createElement(
            "button",
            { type: "button", className: "dshg-mini", title: "\u5173\u95ED\u5DEE\u5F02\uFF08Esc\uFF09", onClick: () => setSelected(null) },
            React9.createElement(Icon5, { name: "close" })
          )
        ),
        React9.createElement(
          "div",
          { className: `dshg-diffbody${diffSplit ? " dshg-diffbody-split" : ""}` },
          diffLoading ? React9.createElement("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u8BFB\u53D6\u5DEE\u5F02\u2026") : null,
          !diffLoading && diffError !== "" ? React9.createElement("div", { className: "dshg-diffempty" }, diffError) : null,
          !diffLoading && diffPayload !== null && diffPayload.binary ? React9.createElement(BinaryDiffView, { cwd, path: diffPayload.path }) : null,
          !diffLoading && diffPayload !== null && !diffPayload.binary ? React9.createElement(diffSplit ? DiffBodySplit : DiffBody, { patch: diffPayload.patch }) : null,
          diffPayload?.tooLarge === true ? React9.createElement("div", { className: "dshg-diffempty" }, "\u5DEE\u5F02\u8FC7\u5927\uFF0C\u4EC5\u663E\u793A\u524D 60 \u4E07\u5B57\u7B26") : null
        )
      );
      return React9.createElement(
        React9.Fragment,
        null,
        list,
        diffPanel
      );
    }
    if (state === null) return null;
    return React9.createElement(
      "div",
      { className: "dshg-list dshg-list-graph" },
      React9.createElement(
        "div",
        { className: "dshg-sechead dshg-static" },
        React9.createElement("span", { className: "dshg-sectitle" }, historyPath !== "" ? "\u6587\u4EF6\u5386\u53F2" : "\u56FE\u8868"),
        React9.createElement("span", { className: "dshg-count" }, graphCommits.length),
        React9.createElement(
          "span",
          { className: "dshg-secactions" },
          historyPath !== "" ? React9.createElement(
            "button",
            {
              type: "button",
              className: "dshg-mini",
              title: `\u6E05\u9664\u7B5B\u9009\uFF1A${historyPath}`,
              onClick: () => {
                setHistoryPath("");
                setHistoryCommits(null);
              }
            },
            React9.createElement(Icon5, { name: "close" })
          ) : React9.createElement("span", { className: "dshg-gsha" }, state.repo.branch)
        )
      ),
      historyPath !== "" ? React9.createElement("div", { className: "dshg-history-path", title: historyPath }, historyPath) : null,
      ...graphRows.map((row) => {
        const commit = commitBySha.get(row.sha);
        if (commit === void 0) return null;
        const head = commit.sha === state.repo.head;
        return React9.createElement(
          "div",
          {
            key: row.sha,
            className: `dshg-grow${head ? " dshg-grow-head" : ""}${commitSha === commit.sha ? " dshg-grow-on" : ""}`,
            role: "button",
            tabIndex: 0,
            title: `${commit.sha}
${commit.author}
${commit.subject}`,
            onClick: () => clickCommit(commit),
            onContextMenu: (event) => openCommitMenu(event, commit),
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                clickCommit(commit);
              }
            }
          },
          React9.createElement(GraphLanes, { row, lanes: laneTotal }),
          React9.createElement(
            "span",
            { className: "dshg-gmeta" },
            ...commit.refs.slice(0, 3).map(
              (ref, index) => React9.createElement(
                "span",
                { key: `${ref}-${index}`, className: "dshg-gref", "data-kind": refKind(ref) },
                refLabel(ref)
              )
            ),
            React9.createElement("span", { className: "dshg-gsubject" }, commit.subject === "" ? "(no message)" : commit.subject)
          ),
          React9.createElement(
            "span",
            { className: "dshg-gside" },
            React9.createElement("span", { className: "dshg-gsha" }, commit.short),
            React9.createElement("span", null, relativeTime(commit.time))
          )
        );
      })
    );
  };
  const commitPanel = commitSha !== "" && tab === "graph" ? detail !== null ? React9.createElement(CommitDetailView, {
    cwd,
    sha: commitSha,
    split: diffSplit,
    onToggleSplit: () => setDiffSplit((prev) => !prev),
    onClose: () => setCommitSha("")
  }) : React9.createElement(
    "div",
    { className: "dshg-diff" },
    React9.createElement(
      "div",
      { className: "dshg-diffhead" },
      React9.createElement(Icon5, { name: "commit" }),
      React9.createElement("span", { className: "dshg-diffpath" }, `\u63D0\u4EA4 ${commitSha.slice(0, 7)}`),
      React9.createElement("span", { className: "dshg-spacer" }),
      React9.createElement(
        "button",
        { type: "button", className: "dshg-mini", title: "\u5173\u95ED", onClick: () => setCommitSha("") },
        React9.createElement(Icon5, { name: "close" })
      )
    ),
    React9.createElement("div", { className: "dshg-diffbody" }, React9.createElement("div", { className: "dshg-diffempty" }, "\u6B63\u5728\u8BFB\u53D6\u63D0\u4EA4\u2026"))
  ) : null;
  const sideOpen = conflictFile !== "" || compareOpen || tab === "graph" && commitSha !== "";
  const sidePanel = conflictFile !== "" ? React9.createElement(ConflictPanel, {
    cwd,
    file: conflictFile,
    onClose: () => setConflictFile(""),
    onResolved: () => {
      setSelected(null);
      repo.refresh(false);
    }
  }) : compareOpen ? React9.createElement(CompareView, {
    cwd,
    onClose: () => setCompareOpen(false),
    onPick: (sha) => {
      setCompareOpen(false);
      setTab("graph");
      setCommitSha(sha);
    }
  }) : commitPanel;
  return React9.createElement(
    React9.Fragment,
    null,
    React9.createElement("div", {
      style: { position: "fixed", inset: 0, zIndex: 2147482e3, background: "transparent" },
      onClick: onClose
    }),
    React9.createElement(
      "div",
      {
        className: "dshg-root",
        role: "dialog",
        "aria-label": "\u6E90\u4EE3\u7801\u7BA1\u7406",
        "data-dsh-plugin": "wagq-dsh-git",
        "data-dsh-part": "scm-popup",
        "data-dsh-surface": "overlay",
        // `data-side` pins the shell height once a column is split in two.
        "data-side": sideOpen || tab === "changes" && selected !== null,
        style: { position: "fixed", zIndex: 2147482001, ...position() },
        onClick: (event) => event.stopPropagation()
      },
      /* ---- header ---- */
      React9.createElement(
        "div",
        { className: "dshg-head" },
        React9.createElement("span", { className: "dshg-title" }, React9.createElement(Icon5, { name: "git" }), "\u6E90\u4EE3\u7801\u7BA1\u7406"),
        state !== null ? React9.createElement(
          "button",
          {
            type: "button",
            className: "dshg-branch dshg-branch-btn",
            title: `\u5F53\u524D\u5206\u652F ${state.repo.branch}${state.repo.upstream === "" ? "" : `\uFF08\u8DDF\u8E2A ${state.repo.upstream}\uFF09`}
\u70B9\u51FB\u5207\u6362\u5206\u652F`,
            onClick: (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              showBranchPicker({ x: rect.right, y: rect.bottom });
            }
          },
          React9.createElement(Icon5, { name: "branch" }),
          state.repo.branch,
          state.repo.detached ? React9.createElement("span", { className: "dshg-branch-tag" }, "detached") : null
        ) : React9.createElement("span", { className: "dshg-repo" }, cwd === "" ? "\u672A\u7ED1\u5B9A\u5DE5\u4F5C\u76EE\u5F55" : cwd),
        state !== null && (ahead > 0 || behind > 0) ? React9.createElement(
          "button",
          {
            type: "button",
            className: `dshg-ahead${compareOpen ? " dshg-ahead-on" : ""}`,
            title: `\u4E0E ${state.repo.upstream === "" ? "\u8FDC\u7A0B" : state.repo.upstream} \u5BF9\u6BD4\uFF08\u9886\u5148 ${ahead} / \u843D\u540E ${behind}\uFF09
\u70B9\u51FB\u67E5\u770B\u4E24\u8FB9\u7684\u63D0\u4EA4`,
            onClick: () => setCompareOpen((prev) => !prev)
          },
          ahead > 0 ? React9.createElement("span", { className: "dshg-ahead-up" }, `\u2191${ahead}`) : null,
          behind > 0 ? React9.createElement("span", { className: "dshg-ahead-down" }, `\u2193${behind}`) : null
        ) : state !== null ? React9.createElement(
          "button",
          {
            type: "button",
            className: `dshg-ahead${compareOpen ? " dshg-ahead-on" : ""}`,
            title: state.repo.upstream === "" ? "\u6CA1\u6709\u4E0A\u6E38\u5206\u652F" : `\u4E0E ${state.repo.upstream} \u5BF9\u6BD4\uFF1A\u5DF2\u540C\u6B65`,
            onClick: () => setCompareOpen((prev) => !prev)
          },
          React9.createElement("span", { className: "dshg-ahead-even" }, "\u21C5")
        ) : null,
        React9.createElement("span", { className: "dshg-spacer" }),
        React9.createElement(
          "button",
          {
            type: "button",
            className: `dshg-iconbtn${repo.loading ? " dshg-spinning" : ""}`,
            title: "\u5237\u65B0",
            disabled: repo.loading,
            onClick: doManualRefresh
          },
          React9.createElement(Icon5, { name: "refresh" })
        ),
        React9.createElement(
          "button",
          {
            type: "button",
            className: "dshg-iconbtn",
            title: "\u66F4\u591A\u64CD\u4F5C",
            "aria-haspopup": "menu",
            onClick: openMainMenu
          },
          React9.createElement(Icon5, { name: "dots" })
        ),
        React9.createElement(
          "button",
          { type: "button", className: "dshg-iconbtn", title: "\u5173\u95ED\uFF08Esc\uFF09", onClick: onClose },
          React9.createElement(Icon5, { name: "close" })
        )
      ),
      banner,
      /* ---- tabs ---- */
      React9.createElement(
        "div",
        { className: "dshg-tabs", role: "tablist" },
        tabButton("changes", "\u66F4\u6539", state === null ? void 0 : state.staged.length + state.changes.length + state.untracked.length),
        tabButton("graph", "\u56FE\u8868", state === null ? void 0 : state.commits.length),
        tabButton("files", "\u6587\u4EF6\u6D4F\u89C8"),
        tabButton("terminal", "\u7EC8\u7AEF")
      ),
      /* ---- commit box ---- */
      tab === "changes" && cwd !== "" ? React9.createElement(
        "div",
        { className: "dshg-commit" },
        React9.createElement("textarea", {
          ref: messageRef,
          className: "dshg-msg",
          placeholder: `\u6D88\u606F\uFF08Ctrl+Enter \u5728 ${state?.repo.branch ?? "main"} \u4E0A\u63D0\u4EA4\uFF09`,
          value: message,
          spellCheck: false,
          onChange: (event) => setMessage(event.target.value),
          onKeyDown: (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              doCommit();
            }
          }
        }),
        React9.createElement(
          "div",
          { className: "dshg-commitrow" },
          React9.createElement(
            "button",
            {
              type: "button",
              className: "dshg-primary",
              disabled: busy !== "" || stagedCount === 0 && !amend || message.trim() === "",
              title: stagedCount === 0 ? "\u5148\u6682\u5B58\u8981\u63D0\u4EA4\u7684\u6587\u4EF6" : "\u63D0\u4EA4\uFF08Ctrl+Enter\uFF09",
              onClick: doCommit
            },
            React9.createElement(Icon5, { name: "check" }),
            busy === "commit" ? "\u63D0\u4EA4\u4E2D\u2026" : "\u63D0\u4EA4"
          ),
          React9.createElement(
            "button",
            {
              type: "button",
              className: "dshg-split-arrow",
              title: "\u66F4\u591A\u63D0\u4EA4\u9009\u9879",
              disabled: busy !== "",
              onClick: (event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                showMenu([
                  { id: "h", label: "\u63D0\u4EA4\u9009\u9879", heading: true },
                  {
                    id: "amend",
                    label: "\u4FEE\u6539\u4E0A\u6B21\u63D0\u4EA4\uFF08amend\uFF09",
                    hint: amend ? "\u2713" : void 0,
                    onSelect: () => setAmend((prev) => !prev)
                  },
                  {
                    id: "signoff",
                    label: "\u6DFB\u52A0 Signed-off-by",
                    hint: signoff ? "\u2713" : void 0,
                    onSelect: () => setSignoff((prev) => !prev)
                  }
                ], { x: rect.right - 214, y: rect.bottom + 4 });
              }
            },
            React9.createElement(Icon5, { name: "chevron" })
          )
        ),
        React9.createElement(
          "div",
          { className: "dshg-subrow" },
          React9.createElement(
            "label",
            { className: "dshg-check" },
            React9.createElement("input", {
              type: "checkbox",
              checked: amend,
              onChange: (event) => setAmend(event.target.checked)
            }),
            "\u4FEE\u6539\u4E0A\u6B21\u63D0\u4EA4"
          ),
          // Generated by the SAME model the conversation is running on.
          React9.createElement(
            "button",
            {
              type: "button",
              className: "dshg-genbtn",
              disabled: busy !== "" || stagedCount === 0 && (state?.changes.length ?? 0) + (state?.untracked.length ?? 0) === 0,
              title: "\u7528\u5F53\u524D\u4F1A\u8BDD\u7684\u6A21\u578B\uFF0C\u6839\u636E\u5DEE\u5F02\u81EA\u52A8\u751F\u6210\u63D0\u4EA4\u6D88\u606F",
              onClick: doGenerate
            },
            React9.createElement(Icon5, { name: "spark" }),
            busy === "generate" ? "\u751F\u6210\u4E2D\u2026" : "\u751F\u6210\u63D0\u4EA4\u6D88\u606F"
          ),
          React9.createElement("span", { className: "dshg-spacer" }),
          signoff ? React9.createElement("span", { className: "dshg-rowstat", title: "\u63D0\u4EA4\u4F1A\u9644\u5E26 Signed-off-by" }, "\u2713 signoff") : null,
          notice !== "" ? React9.createElement("span", { className: "dshg-rowstat dshg-add" }, notice) : stagedCount > 0 ? React9.createElement("span", { className: "dshg-rowstat" }, `${stagedCount} \u4E2A\u6587\u4EF6\u5DF2\u6682\u5B58`) : null
        )
      ) : null,
      /* ---- body ---- */
      // `dshg-pane` is the left column and `sidePanel` the right one; `bodyForTab`
      // returns only the content, never its own column wrapper.
      React9.createElement("div", { className: "dshg-body" }, bodyForTab(), sidePanel),
      /* ---- footer ---- */
      React9.createElement(
        "div",
        { className: "dshg-foot" },
        React9.createElement(
          "span",
          { title: state?.repo.upstream === "" ? "\u6CA1\u6709\u4E0A\u6E38\u5206\u652F" : `\u8DDF\u8E2A ${state?.repo.upstream}` },
          state === null || state.repo.upstream === "" ? "\u65E0\u4E0A\u6E38" : state.repo.upstream
        ),
        React9.createElement("span", null, "\u66F4\u6539 ", React9.createElement("b", null, String((state?.changes.length ?? 0) + (state?.untracked.length ?? 0)))),
        React9.createElement("span", null, "\u6682\u5B58 ", React9.createElement("b", null, String(stagedCount))),
        React9.createElement("span", { className: "dshg-spacer" }),
        React9.createElement("span", null, busy === "" ? "\u53F3\u952E\u63D0\u4EA4\u53EF\u590D\u5236/\u91CD\u7F6E" : `${busy}\u2026`)
      )
    ),
    /* ---- floating layers ---- */
    menu !== null ? React9.createElement(Menu, { x: menu.x, y: menu.y, items: menu.items, onClose: () => setMenu(null) }) : null,
    branchPicker !== null ? React9.createElement(BranchPicker, {
      cwd,
      current: state?.repo.branch ?? "",
      x: branchPicker.x,
      y: branchPicker.y,
      onClose: () => setBranchPicker(null),
      onSwitched: () => repo.refresh(false)
    }) : null,
    confirm !== null ? React9.createElement(ConfirmDialog, {
      confirm,
      onClose: () => setConfirm(null)
    }) : null
  );
}
function sameSessionId(a, b) {
  const strip = (value) => value.replace(/^session-/, "");
  const left = strip(a);
  return left !== "" && left === strip(b);
}
function GitHeaderButton(props) {
  ensureStyles();
  const global = props.variant === "global";
  const [open, setOpen] = React9.useState(false);
  const [anchor, setAnchor] = React9.useState(null);
  const [cwd, setCwd] = React9.useState(props.cwd ?? "");
  const [resolving, setResolving] = React9.useState(false);
  const [resolveError, setResolveError] = React9.useState("");
  const buttonRef = React9.useRef(null);
  const storeCwd = props.useSessions?.((state) => {
    const byId = state.byId;
    if (byId === void 0) return void 0;
    const wanted = props.sessionId;
    if (wanted !== void 0) {
      const direct = byId[wanted]?.cwd;
      if (typeof direct === "string" && direct !== "") return direct;
      for (const [key, row] of Object.entries(byId)) {
        if (sameSessionId(key, wanted) && typeof row?.cwd === "string" && row.cwd !== "") return row.cwd;
      }
      return void 0;
    }
    const ids = state.ids;
    const newest = Array.isArray(ids) && ids.length > 0 ? ids[ids.length - 1] : void 0;
    const fromNewest = newest === void 0 ? void 0 : byId[newest]?.cwd;
    if (typeof fromNewest === "string" && fromNewest !== "") return fromNewest;
    for (const row of Object.values(byId)) {
      if (typeof row?.cwd === "string" && row.cwd !== "") return row.cwd;
    }
    return void 0;
  });
  const resolvedFor = React9.useRef(void 0);
  React9.useEffect(() => {
    if (resolvedFor.current !== props.sessionId) {
      resolvedFor.current = props.sessionId;
      setCwd(props.cwd ?? "");
      setResolveError("");
    }
  }, [props.sessionId, props.cwd]);
  React9.useEffect(() => {
    if (!open || resolving) return;
    if (!global && typeof storeCwd === "string" && storeCwd !== "") {
      setCwd((prev) => prev === storeCwd ? prev : storeCwd);
      return;
    }
    if (cwd !== "") return;
    setResolving(true);
    setResolveError("");
    const wanted = props.sessionId ?? "";
    api.sessions().then((result) => {
      const hit = wanted === "" ? void 0 : result.sessions.find((row) => sameSessionId(row.id, wanted));
      if (hit === void 0) {
        setCwd("");
        return;
      }
      setCwd(hit.cwd);
    }).catch((err) => setResolveError(err instanceof Error ? err.message : String(err))).finally(() => setResolving(false));
  }, [open, cwd, resolving, global, props.sessionId, storeCwd]);
  return React9.createElement(
    React9.Fragment,
    null,
    React9.createElement(
      "button",
      {
        ref: buttonRef,
        type: "button",
        className: `dshg-iconbtn dshg-trigger${open ? " dshg-trigger-on" : ""}${global ? " dshg-trigger-global" : " dshg-trigger-session"}`,
        title: "\u6E90\u4EE3\u7801\u7BA1\u7406\uFF08Git\uFF09",
        "aria-label": "\u6E90\u4EE3\u7801\u7BA1\u7406",
        "aria-expanded": open,
        "data-dsh-plugin": "wagq-dsh-git",
        "data-dsh-part": global ? "scm-button-global" : "scm-button",
        onClick: () => {
          setAnchor(buttonRef.current?.getBoundingClientRect() ?? null);
          setOpen((prev) => !prev);
        }
      },
      React9.createElement(Icon5, { name: "git" })
    ),
    open ? resolveError !== "" ? React9.createElement(
      "div",
      { className: "dshg-err", style: { position: "fixed", top: 64, right: 16, maxWidth: 360, margin: 0, zIndex: 2147482001 } },
      resolveError
    ) : React9.createElement(Popup, { cwd, sessionId: props.sessionId ?? "", anchor, onClose: () => setOpen(false) }) : null
  );
}

// src/client/index.ts
var name = "wagq-dsh-git-client";
var inject = ["slots"];
var SESSION_SLOT = "conversation.session.header.utilities";
var GLOBAL_SLOT = "conversation.header.leading";
function apply(ctx) {
  ensureStyles();
  ctx.effect(
    () => ctx.slots.inject(
      SESSION_SLOT,
      () => ctx.slots.register(
        {
          name: SESSION_SLOT,
          id: "wagq-dsh-git",
          order: 30
        },
        (props) => GitHeaderButton({ sessionId: props?.sessionId, useSessions: props?.useSessions, variant: "session" })
      )
    ),
    "wagq-dsh-git: session-header-button"
  );
  ctx.effect(
    () => ctx.slots.inject(
      GLOBAL_SLOT,
      () => ctx.slots.register(
        { name: GLOBAL_SLOT, id: "wagq-dsh-git-global", order: 30 },
        () => GitHeaderButton({ variant: "global" })
      )
    ),
    "wagq-dsh-git: global-header-button"
  );
  ctx.effect(() => () => removeStyles(), "wagq-dsh-git: styles");
}

    return module.exports;
  },
});

