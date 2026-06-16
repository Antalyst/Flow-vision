import { createHash, randomUUID } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { EventEmitter as EventEmitter$6 } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import * as sqlEscaper from 'sql-escaper';
import * as events from 'events';
import * as lru from 'lru.min';
import * as process$6 from 'process';
import * as net from 'net';
import * as tls from 'tls';
import * as timers from 'timers';
import * as stream from 'stream';
import * as denque from 'denque';
import * as buffer from 'buffer';
import * as long from 'long';
import * as iconvLite from 'iconv-lite';
import * as crypto$3 from 'crypto';
import * as zlib from 'zlib';
import * as generateFunction from 'generate-function';
import * as url from 'url';
import * as awsSslProfiles from 'aws-ssl-profiles';
import * as namedPlaceholders from 'named-placeholders';
import { getIcons } from '@iconify/utils';
import { consola } from 'consola';
import { promises, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const IM_RE = /\?/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
const ENC_ENC_SLASH_RE = /%252f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function encodePath(text) {
  return encode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F").replace(AMPERSAND_RE, "%26").replace(PLUS_RE, "%2B");
}
function decode$1(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$1(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery$1(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length).replace(/^\/+/, "");
  return "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery$1(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NullObject = /* @__PURE__ */ (() => {
  const C = function() {
  };
  C.prototype = /* @__PURE__ */ Object.create(null);
  return C;
})();
function parse$1(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = new NullObject();
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$2(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter$6{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter$6{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c$1=class c{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c$1.prototype,i$1.prototype),Object.assign(c$1.prototype,l$1.prototype),c$1}function m(...n){return function(...e){for(const t of n)t(...e);}}const g=_();class A extends g{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function parse(multipartBodyBuffer, boundary) {
  let lastline = "";
  let state = 0 /* INIT */;
  let buffer = [];
  const allParts = [];
  let currentPartHeaders = [];
  for (let i = 0; i < multipartBodyBuffer.length; i++) {
    const prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null;
    const currByte = multipartBodyBuffer[i];
    const newLineChar = currByte === 10 || currByte === 13;
    if (!newLineChar) {
      lastline += String.fromCodePoint(currByte);
    }
    const newLineDetected = currByte === 10 && prevByte === 13;
    if (0 /* INIT */ === state && newLineDetected) {
      if ("--" + boundary === lastline) {
        state = 1 /* READING_HEADERS */;
      }
      lastline = "";
    } else if (1 /* READING_HEADERS */ === state && newLineDetected) {
      if (lastline.length > 0) {
        const i2 = lastline.indexOf(":");
        if (i2 > 0) {
          const name = lastline.slice(0, i2).toLowerCase();
          const value = lastline.slice(i2 + 1).trim();
          currentPartHeaders.push([name, value]);
        }
      } else {
        state = 2 /* READING_DATA */;
        buffer = [];
      }
      lastline = "";
    } else if (2 /* READING_DATA */ === state) {
      if (lastline.length > boundary.length + 4) {
        lastline = "";
      }
      if ("--" + boundary === lastline) {
        const j = buffer.length - lastline.length;
        const part = buffer.slice(0, j - 1);
        allParts.push(process$5(part, currentPartHeaders));
        buffer = [];
        currentPartHeaders = [];
        lastline = "";
        state = 3 /* READING_PART_SEPARATOR */;
      } else {
        buffer.push(currByte);
      }
      if (newLineDetected) {
        lastline = "";
      }
    } else if (3 /* READING_PART_SEPARATOR */ === state && newLineDetected) {
      state = 1 /* READING_HEADERS */;
    }
  }
  return allParts;
}
function process$5(data, headers) {
  const dataObj = {};
  const contentDispositionHeader = headers.find((h) => h[0] === "content-disposition")?.[1] || "";
  for (const i of contentDispositionHeader.split(";")) {
    const s = i.split("=");
    if (s.length !== 2) {
      continue;
    }
    const key = (s[0] || "").trim();
    if (key === "name" || key === "filename") {
      const _value = (s[1] || "").trim().replace(/"/g, "");
      dataObj[key] = Buffer.from(_value, "latin1").toString("utf8");
    }
  }
  const contentType = headers.find((h) => h[0] === "content-type")?.[1] || "";
  if (contentType) {
    dataObj.type = contentType;
  }
  dataObj.data = Buffer.from(data);
  return dataObj;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const ParsedBodySymbol = Symbol.for("h3ParsedBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
async function readBody(event, options = {}) {
  const request = event.node.req;
  if (hasProp(request, ParsedBodySymbol)) {
    return request[ParsedBodySymbol];
  }
  const contentType = request.headers["content-type"] || "";
  const body = await readRawBody(event);
  let parsed;
  if (contentType === "application/json") {
    parsed = _parseJSON(body, options.strict ?? true);
  } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
    parsed = _parseURLEncodedBody(body);
  } else if (contentType.startsWith("text/")) {
    parsed = body;
  } else {
    parsed = _parseJSON(body, options.strict ?? false);
  }
  request[ParsedBodySymbol] = parsed;
  return parsed;
}
async function readMultipartFormData(event) {
  const contentType = getRequestHeader(event, "content-type");
  if (!contentType || !contentType.startsWith("multipart/form-data")) {
    return;
  }
  const boundary = contentType.match(/boundary=([^;]*)(;|$)/i)?.[1];
  if (!boundary) {
    return;
  }
  const body = await readRawBody(event, false);
  if (!body) {
    return;
  }
  return parse(body, boundary);
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}
function _parseJSON(body = "", strict) {
  if (!body) {
    return void 0;
  }
  try {
    return destr(body, { strict });
  } catch {
    throw createError$1({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid JSON body"
    });
  }
}
function _parseURLEncodedBody(body) {
  const form = new URLSearchParams(body);
  const parsedForm = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of form.entries()) {
    if (hasProp(parsedForm, key)) {
      if (!Array.isArray(parsedForm[key])) {
        parsedForm[key] = [parsedForm[key]];
      }
      parsedForm[key].push(value);
    } else {
      parsedForm[key] = value;
    }
  }
  return parsedForm;
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies(event) {
  return parse$1(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$2(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function deleteCookie(event, name, serializeOptions) {
  setCookie(event, name, "", {
    ...serializeOptions,
    maxAge: 0
  });
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$1=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch$1 = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$1;
const AbortController$1 = globalThis.AbortController || i;
const ofetch = createFetch({ fetch: fetch$1, Headers: Headers$1, AbortController: AbortController$1 });
const $fetch$1 = ofetch;

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

function serialize$1(o){return typeof o=="string"?`'${o}'`:new c().serialize(o)}const c=/*@__PURE__*/function(){class o{#t=new Map;compare(t,r){const e=typeof t,n=typeof r;return e==="string"&&n==="string"?t.localeCompare(r):e==="number"&&n==="number"?t-r:String.prototype.localeCompare.call(this.serialize(t,true),this.serialize(r,true))}serialize(t,r){if(t===null)return "null";switch(typeof t){case "string":return r?t:`'${t}'`;case "bigint":return `${t}n`;case "object":return this.$object(t);case "function":return this.$function(t)}return String(t)}serializeObject(t){const r=Object.prototype.toString.call(t);if(r!=="[object Object]")return this.serializeBuiltInType(r.length<10?`unknown:${r}`:r.slice(8,-1),t);const e=t.constructor,n=e===Object||e===void 0?"":e.name;if(n!==""&&globalThis[n]===e)return this.serializeBuiltInType(n,t);if(typeof t.toJSON=="function"){const i=t.toJSON();return n+(i!==null&&typeof i=="object"?this.$object(i):`(${this.serialize(i)})`)}return this.serializeObjectEntries(n,Object.entries(t))}serializeBuiltInType(t,r){const e=this["$"+t];if(e)return e.call(this,r);if(typeof r?.entries=="function")return this.serializeObjectEntries(t,r.entries());throw new Error(`Cannot serialize ${t}`)}serializeObjectEntries(t,r){const e=Array.from(r).sort((i,a)=>this.compare(i[0],a[0]));let n=`${t}{`;for(let i=0;i<e.length;i++){const[a,l]=e[i];n+=`${this.serialize(a,true)}:${this.serialize(l)}`,i<e.length-1&&(n+=",");}return n+"}"}$object(t){let r=this.#t.get(t);return r===void 0&&(this.#t.set(t,`#${this.#t.size}`),r=this.serializeObject(t),this.#t.set(t,r)),r}$function(t){const r=Function.prototype.toString.call(t);return r.slice(-15)==="[native code] }"?`${t.name||""}()[native]`:`${t.name}(${t.length})${r.replace(/\s*\n\s*/g,"")}`}$Array(t){let r="[";for(let e=0;e<t.length;e++)r+=this.serialize(t[e]),e<t.length-1&&(r+=",");return r+"]"}$Date(t){try{return `Date(${t.toISOString()})`}catch{return "Date(null)"}}$ArrayBuffer(t){return `ArrayBuffer[${new Uint8Array(t).join(",")}]`}$Set(t){return `Set${this.$Array(Array.from(t).sort((r,e)=>this.compare(r,e)))}`}$Map(t){return this.serializeObjectEntries("Map",t.entries())}}for(const s of ["Error","RegExp","URL"])o.prototype["$"+s]=function(t){return `${s}(${t})`};for(const s of ["Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join(",")}]`};for(const s of ["BigInt64Array","BigUint64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join("n,")}${t.length>0?"n":""}]`};return o}();

function isEqual(object1, object2) {
  if (object1 === object2) {
    return true;
  }
  if (serialize$1(object1) === serialize$1(object2)) {
    return true;
  }
  return false;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

function hash$1(input) {
  return digest(serialize$1(input));
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {
  "nuxt": {},
  "icon": {
    "provider": "server",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "mode": "css",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codex",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "cuida",
      "dashicons",
      "devicon",
      "devicon-plain",
      "dinkie-icons",
      "duo-icons",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fa7-brands",
      "fa7-regular",
      "fa7-solid",
      "fad",
      "famicons",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-color",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "garden",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "ix",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "lineicons",
      "logos",
      "ls",
      "lsicon",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-icon-theme",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "meteor-icons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "nrk",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "picon",
      "pixel",
      "pixelarticons",
      "prime",
      "proicons",
      "ps",
      "qlementine-icons",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "roentgen",
      "si",
      "si-glyph",
      "sidekickicons",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "stash",
      "streamline",
      "streamline-block",
      "streamline-color",
      "streamline-cyber",
      "streamline-cyber-color",
      "streamline-emojis",
      "streamline-flex",
      "streamline-flex-color",
      "streamline-freehand",
      "streamline-freehand-color",
      "streamline-kameleon-color",
      "streamline-logos",
      "streamline-pixel",
      "streamline-plump",
      "streamline-plump-color",
      "streamline-sharp",
      "streamline-sharp-color",
      "streamline-stickies-color",
      "streamline-ultimate",
      "streamline-ultimate-color",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "temaki",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  }
};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "8a201a34-3ad3-459b-8e96-e035adb23268",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false,
        "isr": false
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "supabaseUrl": "https://ryohgztqeuzpsjwwjmdd.supabase.co",
    "supabaseAnonKey": "sb_publishable_jENK8LR7AGYeeWOk6VhhfQ_ne0fLw-A"
  },
  "mysqlHost": "srv1322.hstgr.io",
  "mysqlUser": "u520834156_usrFV2026",
  "mysqlPassword": "@1BMIz6X",
  "mysqlDatabase": "u520834156_flowVsionDB",
  "supabaseServiceKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b2hnenRxZXV6cHNqd3dqbWRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc0MzU5NCwiZXhwIjoyMDkzMzE5NTk0fQ.whkwgjRtpXu7WVz6uiiuAIO5kNIY2wkcvyiF-se3s78",
  "icon": {
    "serverKnownCssClasses": []
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
const _sharedAppConfig = _deepFreeze(klona(appConfig));
function useAppConfig(event) {
  {
    return _sharedAppConfig;
  }
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
function executeAsync(function_) {
  const restores = [];
  for (const leaveHandler of asyncHandlers) {
    const restore2 = leaveHandler();
    if (restore2) {
      restores.push(restore2);
    }
  }
  const restore = () => {
    for (const restore2 of restores) {
      restore2();
    }
  };
  let awaitable = function_();
  if (awaitable && typeof awaitable === "object" && "catch" in awaitable) {
    awaitable = awaitable.catch((error) => {
      restore();
      throw error;
    });
  }
  return [awaitable, restore];
}

function isPathInScope(pathname, base) {
  let canonical;
  try {
    const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
    canonical = new URL(pre, "http://_").pathname;
  } catch {
    return false;
  }
  return !base || canonical === base || canonical.startsWith(base + "/");
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function isJsonRequest(event) {
	
	if (hasReqHeader(event, "accept", "text/html")) {
		return false;
	}
	return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
	const value = getRequestHeader(event, name);
	return !!(value && typeof value === "string" && value.toLowerCase().includes(includes));
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
	if (event.handled || isJsonRequest(event)) {
		
		return;
	}
	
	const defaultRes = await defaultHandler(error, event, { json: true });
	
	const status = error.status || error.statusCode || 500;
	if (status === 404 && defaultRes.status === 302) {
		setResponseHeaders(event, defaultRes.headers);
		setResponseStatus(event, defaultRes.status, defaultRes.statusText);
		return send(event, JSON.stringify(defaultRes.body, null, 2));
	}
	const errorObject = defaultRes.body;
	
	const url = new URL(errorObject.url);
	errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
	
	errorObject.message = error.unhandled ? errorObject.message || "Server Error" : error.message || errorObject.message || "Server Error";
	
	errorObject.data ||= error.data;
	errorObject.statusText ||= error.statusText || error.statusMessage;
	delete defaultRes.headers["content-type"];
	delete defaultRes.headers["content-security-policy"];
	setResponseHeaders(event, defaultRes.headers);
	
	const reqHeaders = getRequestHeaders(event);
	
	const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
	
	const res = isRenderingError ? null : await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject), {
		headers: {
			...reqHeaders,
			"x-nuxt-error": "true"
		},
		redirect: "manual"
	}).catch(() => null);
	if (event.handled) {
		return;
	}
	
	if (!res) {
		const { template } = await import('./error-500.mjs');
		setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
		return send(event, template(errorObject));
	}
	const html = await res.text();
	for (const [header, value] of res.headers.entries()) {
		if (header === "set-cookie") {
			appendResponseHeader(event, header, value);
			continue;
		}
		setResponseHeader(event, header, value);
	}
	setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
	return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

function defineNitroPlugin(def) {
  return def;
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n;
}

var promise = {};

const require$$0$7 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(sqlEscaper);

const require$$1$2 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(events);

const require$$7 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(lru);

const { createLRU: createLRU$2 } = require$$7;

const parserCache$2 = createLRU$2({
  max: 15000,
});

function keyFromFields(type, fields, options, config) {
  const res = [
    type,
    typeof options.nestTables,
    options.nestTables,
    Boolean(options.rowsAsArray),
    Boolean(options.supportBigNumbers || config.supportBigNumbers),
    Boolean(options.bigNumberStrings || config.bigNumberStrings),
    typeof options.typeCast === 'boolean'
      ? options.typeCast
      : typeof options.typeCast,
    options.timezone || config.timezone,
    Boolean(options.decimalNumbers),
    options.dateStrings,
  ];

  for (let i = 0; i < fields.length; ++i) {
    const field = fields[i];

    res.push([
      field.name,
      field.columnType,
      field.length,
      field.schema,
      field.table,
      field.flags,
      field.characterSet,
    ]);
  }

  return JSON.stringify(res, null, 0);
}

function getParser(type, fields, options, config, compiler) {
  const key = keyFromFields(type, fields, options, config);
  let parser = parserCache$2.get(key);

  if (parser) {
    return parser;
  }

  parser = compiler(fields, options, config);
  parserCache$2.set(key, parser);
  return parser;
}

function setMaxCache(max) {
  parserCache$2.resize(max);
}

function clearCache() {
  parserCache$2.clear();
}

var parser_cache = {
  getParser: getParser,
  setMaxCache: setMaxCache,
  clearCache: clearCache,
  _keyFromFields: keyFromFields,
};

const require$$0$6 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(process$6);

const require$$0$5 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(net);

const require$$1$1 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(tls);

const require$$2$1 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(timers);

const require$$4$2 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(stream);

const require$$4$1 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(denque);

var errors = {};

(function (exports) {

	// originally copied from https://raw.githubusercontent.com/mysqljs/mysql/7770ee5bb13260c56a160b91fe480d9165dbeeba/lib/protocol/constants/errors.js
	// (c) node-mysql authors

	// updated to contain error codes as is contained in MySQL 8.0
	// by adapting node-mysql: /.../generate-error-constants.js

	/**
	 * MySQL error constants
	 *
	 * Extracted from version 8.0.33
	 *
	 * !! Generated by generate-error-constants.js, do not modify by hand !!
	 */

	exports.EE_CANTCREATEFILE = 1;
	exports.EE_READ = 2;
	exports.EE_WRITE = 3;
	exports.EE_BADCLOSE = 4;
	exports.EE_OUTOFMEMORY = 5;
	exports.EE_DELETE = 6;
	exports.EE_LINK = 7;
	exports.EE_EOFERR = 9;
	exports.EE_CANTLOCK = 10;
	exports.EE_CANTUNLOCK = 11;
	exports.EE_DIR = 12;
	exports.EE_STAT = 13;
	exports.EE_CANT_CHSIZE = 14;
	exports.EE_CANT_OPEN_STREAM = 15;
	exports.EE_GETWD = 16;
	exports.EE_SETWD = 17;
	exports.EE_LINK_WARNING = 18;
	exports.EE_OPEN_WARNING = 19;
	exports.EE_DISK_FULL = 20;
	exports.EE_CANT_MKDIR = 21;
	exports.EE_UNKNOWN_CHARSET = 22;
	exports.EE_OUT_OF_FILERESOURCES = 23;
	exports.EE_CANT_READLINK = 24;
	exports.EE_CANT_SYMLINK = 25;
	exports.EE_REALPATH = 26;
	exports.EE_SYNC = 27;
	exports.EE_UNKNOWN_COLLATION = 28;
	exports.EE_FILENOTFOUND = 29;
	exports.EE_FILE_NOT_CLOSED = 30;
	exports.EE_CHANGE_OWNERSHIP = 31;
	exports.EE_CHANGE_PERMISSIONS = 32;
	exports.EE_CANT_SEEK = 33;
	exports.EE_CAPACITY_EXCEEDED = 34;
	exports.EE_DISK_FULL_WITH_RETRY_MSG = 35;
	exports.EE_FAILED_TO_CREATE_TIMER = 36;
	exports.EE_FAILED_TO_DELETE_TIMER = 37;
	exports.EE_FAILED_TO_CREATE_TIMER_QUEUE = 38;
	exports.EE_FAILED_TO_START_TIMER_NOTIFY_THREAD = 39;
	exports.EE_FAILED_TO_CREATE_TIMER_NOTIFY_THREAD_INTERRUPT_EVENT = 40;
	exports.EE_EXITING_TIMER_NOTIFY_THREAD = 41;
	exports.EE_WIN_LIBRARY_LOAD_FAILED = 42;
	exports.EE_WIN_RUN_TIME_ERROR_CHECK = 43;
	exports.EE_FAILED_TO_DETERMINE_LARGE_PAGE_SIZE = 44;
	exports.EE_FAILED_TO_KILL_ALL_THREADS = 45;
	exports.EE_FAILED_TO_CREATE_IO_COMPLETION_PORT = 46;
	exports.EE_FAILED_TO_OPEN_DEFAULTS_FILE = 47;
	exports.EE_FAILED_TO_HANDLE_DEFAULTS_FILE = 48;
	exports.EE_WRONG_DIRECTIVE_IN_CONFIG_FILE = 49;
	exports.EE_SKIPPING_DIRECTIVE_DUE_TO_MAX_INCLUDE_RECURSION = 50;
	exports.EE_INCORRECT_GRP_DEFINITION_IN_CONFIG_FILE = 51;
	exports.EE_OPTION_WITHOUT_GRP_IN_CONFIG_FILE = 52;
	exports.EE_CONFIG_FILE_PERMISSION_ERROR = 53;
	exports.EE_IGNORE_WORLD_WRITABLE_CONFIG_FILE = 54;
	exports.EE_USING_DISABLED_OPTION = 55;
	exports.EE_USING_DISABLED_SHORT_OPTION = 56;
	exports.EE_USING_PASSWORD_ON_CLI_IS_INSECURE = 57;
	exports.EE_UNKNOWN_SUFFIX_FOR_VARIABLE = 58;
	exports.EE_SSL_ERROR_FROM_FILE = 59;
	exports.EE_SSL_ERROR = 60;
	exports.EE_NET_SEND_ERROR_IN_BOOTSTRAP = 61;
	exports.EE_PACKETS_OUT_OF_ORDER = 62;
	exports.EE_UNKNOWN_PROTOCOL_OPTION = 63;
	exports.EE_FAILED_TO_LOCATE_SERVER_PUBLIC_KEY = 64;
	exports.EE_PUBLIC_KEY_NOT_IN_PEM_FORMAT = 65;
	exports.EE_DEBUG_INFO = 66;
	exports.EE_UNKNOWN_VARIABLE = 67;
	exports.EE_UNKNOWN_OPTION = 68;
	exports.EE_UNKNOWN_SHORT_OPTION = 69;
	exports.EE_OPTION_WITHOUT_ARGUMENT = 70;
	exports.EE_OPTION_REQUIRES_ARGUMENT = 71;
	exports.EE_SHORT_OPTION_REQUIRES_ARGUMENT = 72;
	exports.EE_OPTION_IGNORED_DUE_TO_INVALID_VALUE = 73;
	exports.EE_OPTION_WITH_EMPTY_VALUE = 74;
	exports.EE_FAILED_TO_ASSIGN_MAX_VALUE_TO_OPTION = 75;
	exports.EE_INCORRECT_BOOLEAN_VALUE_FOR_OPTION = 76;
	exports.EE_FAILED_TO_SET_OPTION_VALUE = 77;
	exports.EE_INCORRECT_INT_VALUE_FOR_OPTION = 78;
	exports.EE_INCORRECT_UINT_VALUE_FOR_OPTION = 79;
	exports.EE_ADJUSTED_SIGNED_VALUE_FOR_OPTION = 80;
	exports.EE_ADJUSTED_UNSIGNED_VALUE_FOR_OPTION = 81;
	exports.EE_ADJUSTED_ULONGLONG_VALUE_FOR_OPTION = 82;
	exports.EE_ADJUSTED_DOUBLE_VALUE_FOR_OPTION = 83;
	exports.EE_INVALID_DECIMAL_VALUE_FOR_OPTION = 84;
	exports.EE_COLLATION_PARSER_ERROR = 85;
	exports.EE_FAILED_TO_RESET_BEFORE_PRIMARY_IGNORABLE_CHAR = 86;
	exports.EE_FAILED_TO_RESET_BEFORE_TERTIARY_IGNORABLE_CHAR = 87;
	exports.EE_SHIFT_CHAR_OUT_OF_RANGE = 88;
	exports.EE_RESET_CHAR_OUT_OF_RANGE = 89;
	exports.EE_UNKNOWN_LDML_TAG = 90;
	exports.EE_FAILED_TO_RESET_BEFORE_SECONDARY_IGNORABLE_CHAR = 91;
	exports.EE_FAILED_PROCESSING_DIRECTIVE = 92;
	exports.EE_PTHREAD_KILL_FAILED = 93;
	exports.HA_ERR_KEY_NOT_FOUND = 120;
	exports.HA_ERR_FOUND_DUPP_KEY = 121;
	exports.HA_ERR_INTERNAL_ERROR = 122;
	exports.HA_ERR_RECORD_CHANGED = 123;
	exports.HA_ERR_WRONG_INDEX = 124;
	exports.HA_ERR_ROLLED_BACK = 125;
	exports.HA_ERR_CRASHED = 126;
	exports.HA_ERR_WRONG_IN_RECORD = 127;
	exports.HA_ERR_OUT_OF_MEM = 128;
	exports.HA_ERR_NOT_A_TABLE = 130;
	exports.HA_ERR_WRONG_COMMAND = 131;
	exports.HA_ERR_OLD_FILE = 132;
	exports.HA_ERR_NO_ACTIVE_RECORD = 133;
	exports.HA_ERR_RECORD_DELETED = 134;
	exports.HA_ERR_RECORD_FILE_FULL = 135;
	exports.HA_ERR_INDEX_FILE_FULL = 136;
	exports.HA_ERR_END_OF_FILE = 137;
	exports.HA_ERR_UNSUPPORTED = 138;
	exports.HA_ERR_TOO_BIG_ROW = 139;
	exports.HA_WRONG_CREATE_OPTION = 140;
	exports.HA_ERR_FOUND_DUPP_UNIQUE = 141;
	exports.HA_ERR_UNKNOWN_CHARSET = 142;
	exports.HA_ERR_WRONG_MRG_TABLE_DEF = 143;
	exports.HA_ERR_CRASHED_ON_REPAIR = 144;
	exports.HA_ERR_CRASHED_ON_USAGE = 145;
	exports.HA_ERR_LOCK_WAIT_TIMEOUT = 146;
	exports.HA_ERR_LOCK_TABLE_FULL = 147;
	exports.HA_ERR_READ_ONLY_TRANSACTION = 148;
	exports.HA_ERR_LOCK_DEADLOCK = 149;
	exports.HA_ERR_CANNOT_ADD_FOREIGN = 150;
	exports.HA_ERR_NO_REFERENCED_ROW = 151;
	exports.HA_ERR_ROW_IS_REFERENCED = 152;
	exports.HA_ERR_NO_SAVEPOINT = 153;
	exports.HA_ERR_NON_UNIQUE_BLOCK_SIZE = 154;
	exports.HA_ERR_NO_SUCH_TABLE = 155;
	exports.HA_ERR_TABLE_EXIST = 156;
	exports.HA_ERR_NO_CONNECTION = 157;
	exports.HA_ERR_NULL_IN_SPATIAL = 158;
	exports.HA_ERR_TABLE_DEF_CHANGED = 159;
	exports.HA_ERR_NO_PARTITION_FOUND = 160;
	exports.HA_ERR_RBR_LOGGING_FAILED = 161;
	exports.HA_ERR_DROP_INDEX_FK = 162;
	exports.HA_ERR_FOREIGN_DUPLICATE_KEY = 163;
	exports.HA_ERR_TABLE_NEEDS_UPGRADE = 164;
	exports.HA_ERR_TABLE_READONLY = 165;
	exports.HA_ERR_AUTOINC_READ_FAILED = 166;
	exports.HA_ERR_AUTOINC_ERANGE = 167;
	exports.HA_ERR_GENERIC = 168;
	exports.HA_ERR_RECORD_IS_THE_SAME = 169;
	exports.HA_ERR_LOGGING_IMPOSSIBLE = 170;
	exports.HA_ERR_CORRUPT_EVENT = 171;
	exports.HA_ERR_NEW_FILE = 172;
	exports.HA_ERR_ROWS_EVENT_APPLY = 173;
	exports.HA_ERR_INITIALIZATION = 174;
	exports.HA_ERR_FILE_TOO_SHORT = 175;
	exports.HA_ERR_WRONG_CRC = 176;
	exports.HA_ERR_TOO_MANY_CONCURRENT_TRXS = 177;
	exports.HA_ERR_NOT_IN_LOCK_PARTITIONS = 178;
	exports.HA_ERR_INDEX_COL_TOO_LONG = 179;
	exports.HA_ERR_INDEX_CORRUPT = 180;
	exports.HA_ERR_UNDO_REC_TOO_BIG = 181;
	exports.HA_FTS_INVALID_DOCID = 182;
	exports.HA_ERR_TABLE_IN_FK_CHECK = 183;
	exports.HA_ERR_TABLESPACE_EXISTS = 184;
	exports.HA_ERR_TOO_MANY_FIELDS = 185;
	exports.HA_ERR_ROW_IN_WRONG_PARTITION = 186;
	exports.HA_ERR_INNODB_READ_ONLY = 187;
	exports.HA_ERR_FTS_EXCEED_RESULT_CACHE_LIMIT = 188;
	exports.HA_ERR_TEMP_FILE_WRITE_FAILURE = 189;
	exports.HA_ERR_INNODB_FORCED_RECOVERY = 190;
	exports.HA_ERR_FTS_TOO_MANY_WORDS_IN_PHRASE = 191;
	exports.HA_ERR_FK_DEPTH_EXCEEDED = 192;
	exports.HA_MISSING_CREATE_OPTION = 193;
	exports.HA_ERR_SE_OUT_OF_MEMORY = 194;
	exports.HA_ERR_TABLE_CORRUPT = 195;
	exports.HA_ERR_QUERY_INTERRUPTED = 196;
	exports.HA_ERR_TABLESPACE_MISSING = 197;
	exports.HA_ERR_TABLESPACE_IS_NOT_EMPTY = 198;
	exports.HA_ERR_WRONG_FILE_NAME = 199;
	exports.HA_ERR_NOT_ALLOWED_COMMAND = 200;
	exports.HA_ERR_COMPUTE_FAILED = 201;
	exports.HA_ERR_ROW_FORMAT_CHANGED = 202;
	exports.HA_ERR_NO_WAIT_LOCK = 203;
	exports.HA_ERR_DISK_FULL_NOWAIT = 204;
	exports.HA_ERR_NO_SESSION_TEMP = 205;
	exports.HA_ERR_WRONG_TABLE_NAME = 206;
	exports.HA_ERR_TOO_LONG_PATH = 207;
	exports.HA_ERR_SAMPLING_INIT_FAILED = 208;
	exports.HA_ERR_FTS_TOO_MANY_NESTED_EXP = 209;
	exports.ER_HASHCHK = 1000;
	exports.ER_NISAMCHK = 1001;
	exports.ER_NO = 1002;
	exports.ER_YES = 1003;
	exports.ER_CANT_CREATE_FILE = 1004;
	exports.ER_CANT_CREATE_TABLE = 1005;
	exports.ER_CANT_CREATE_DB = 1006;
	exports.ER_DB_CREATE_EXISTS = 1007;
	exports.ER_DB_DROP_EXISTS = 1008;
	exports.ER_DB_DROP_DELETE = 1009;
	exports.ER_DB_DROP_RMDIR = 1010;
	exports.ER_CANT_DELETE_FILE = 1011;
	exports.ER_CANT_FIND_SYSTEM_REC = 1012;
	exports.ER_CANT_GET_STAT = 1013;
	exports.ER_CANT_GET_WD = 1014;
	exports.ER_CANT_LOCK = 1015;
	exports.ER_CANT_OPEN_FILE = 1016;
	exports.ER_FILE_NOT_FOUND = 1017;
	exports.ER_CANT_READ_DIR = 1018;
	exports.ER_CANT_SET_WD = 1019;
	exports.ER_CHECKREAD = 1020;
	exports.ER_DISK_FULL = 1021;
	exports.ER_DUP_KEY = 1022;
	exports.ER_ERROR_ON_CLOSE = 1023;
	exports.ER_ERROR_ON_READ = 1024;
	exports.ER_ERROR_ON_RENAME = 1025;
	exports.ER_ERROR_ON_WRITE = 1026;
	exports.ER_FILE_USED = 1027;
	exports.ER_FILSORT_ABORT = 1028;
	exports.ER_FORM_NOT_FOUND = 1029;
	exports.ER_GET_ERRNO = 1030;
	exports.ER_ILLEGAL_HA = 1031;
	exports.ER_KEY_NOT_FOUND = 1032;
	exports.ER_NOT_FORM_FILE = 1033;
	exports.ER_NOT_KEYFILE = 1034;
	exports.ER_OLD_KEYFILE = 1035;
	exports.ER_OPEN_AS_READONLY = 1036;
	exports.ER_OUTOFMEMORY = 1037;
	exports.ER_OUT_OF_SORTMEMORY = 1038;
	exports.ER_UNEXPECTED_EOF = 1039;
	exports.ER_CON_COUNT_ERROR = 1040;
	exports.ER_OUT_OF_RESOURCES = 1041;
	exports.ER_BAD_HOST_ERROR = 1042;
	exports.ER_HANDSHAKE_ERROR = 1043;
	exports.ER_DBACCESS_DENIED_ERROR = 1044;
	exports.ER_ACCESS_DENIED_ERROR = 1045;
	exports.ER_NO_DB_ERROR = 1046;
	exports.ER_UNKNOWN_COM_ERROR = 1047;
	exports.ER_BAD_NULL_ERROR = 1048;
	exports.ER_BAD_DB_ERROR = 1049;
	exports.ER_TABLE_EXISTS_ERROR = 1050;
	exports.ER_BAD_TABLE_ERROR = 1051;
	exports.ER_NON_UNIQ_ERROR = 1052;
	exports.ER_SERVER_SHUTDOWN = 1053;
	exports.ER_BAD_FIELD_ERROR = 1054;
	exports.ER_WRONG_FIELD_WITH_GROUP = 1055;
	exports.ER_WRONG_GROUP_FIELD = 1056;
	exports.ER_WRONG_SUM_SELECT = 1057;
	exports.ER_WRONG_VALUE_COUNT = 1058;
	exports.ER_TOO_LONG_IDENT = 1059;
	exports.ER_DUP_FIELDNAME = 1060;
	exports.ER_DUP_KEYNAME = 1061;
	exports.ER_DUP_ENTRY = 1062;
	exports.ER_WRONG_FIELD_SPEC = 1063;
	exports.ER_PARSE_ERROR = 1064;
	exports.ER_EMPTY_QUERY = 1065;
	exports.ER_NONUNIQ_TABLE = 1066;
	exports.ER_INVALID_DEFAULT = 1067;
	exports.ER_MULTIPLE_PRI_KEY = 1068;
	exports.ER_TOO_MANY_KEYS = 1069;
	exports.ER_TOO_MANY_KEY_PARTS = 1070;
	exports.ER_TOO_LONG_KEY = 1071;
	exports.ER_KEY_COLUMN_DOES_NOT_EXITS = 1072;
	exports.ER_BLOB_USED_AS_KEY = 1073;
	exports.ER_TOO_BIG_FIELDLENGTH = 1074;
	exports.ER_WRONG_AUTO_KEY = 1075;
	exports.ER_READY = 1076;
	exports.ER_NORMAL_SHUTDOWN = 1077;
	exports.ER_GOT_SIGNAL = 1078;
	exports.ER_SHUTDOWN_COMPLETE = 1079;
	exports.ER_FORCING_CLOSE = 1080;
	exports.ER_IPSOCK_ERROR = 1081;
	exports.ER_NO_SUCH_INDEX = 1082;
	exports.ER_WRONG_FIELD_TERMINATORS = 1083;
	exports.ER_BLOBS_AND_NO_TERMINATED = 1084;
	exports.ER_TEXTFILE_NOT_READABLE = 1085;
	exports.ER_FILE_EXISTS_ERROR = 1086;
	exports.ER_LOAD_INFO = 1087;
	exports.ER_ALTER_INFO = 1088;
	exports.ER_WRONG_SUB_KEY = 1089;
	exports.ER_CANT_REMOVE_ALL_FIELDS = 1090;
	exports.ER_CANT_DROP_FIELD_OR_KEY = 1091;
	exports.ER_INSERT_INFO = 1092;
	exports.ER_UPDATE_TABLE_USED = 1093;
	exports.ER_NO_SUCH_THREAD = 1094;
	exports.ER_KILL_DENIED_ERROR = 1095;
	exports.ER_NO_TABLES_USED = 1096;
	exports.ER_TOO_BIG_SET = 1097;
	exports.ER_NO_UNIQUE_LOGFILE = 1098;
	exports.ER_TABLE_NOT_LOCKED_FOR_WRITE = 1099;
	exports.ER_TABLE_NOT_LOCKED = 1100;
	exports.ER_BLOB_CANT_HAVE_DEFAULT = 1101;
	exports.ER_WRONG_DB_NAME = 1102;
	exports.ER_WRONG_TABLE_NAME = 1103;
	exports.ER_TOO_BIG_SELECT = 1104;
	exports.ER_UNKNOWN_ERROR = 1105;
	exports.ER_UNKNOWN_PROCEDURE = 1106;
	exports.ER_WRONG_PARAMCOUNT_TO_PROCEDURE = 1107;
	exports.ER_WRONG_PARAMETERS_TO_PROCEDURE = 1108;
	exports.ER_UNKNOWN_TABLE = 1109;
	exports.ER_FIELD_SPECIFIED_TWICE = 1110;
	exports.ER_INVALID_GROUP_FUNC_USE = 1111;
	exports.ER_UNSUPPORTED_EXTENSION = 1112;
	exports.ER_TABLE_MUST_HAVE_COLUMNS = 1113;
	exports.ER_RECORD_FILE_FULL = 1114;
	exports.ER_UNKNOWN_CHARACTER_SET = 1115;
	exports.ER_TOO_MANY_TABLES = 1116;
	exports.ER_TOO_MANY_FIELDS = 1117;
	exports.ER_TOO_BIG_ROWSIZE = 1118;
	exports.ER_STACK_OVERRUN = 1119;
	exports.ER_WRONG_OUTER_JOIN = 1120;
	exports.ER_NULL_COLUMN_IN_INDEX = 1121;
	exports.ER_CANT_FIND_UDF = 1122;
	exports.ER_CANT_INITIALIZE_UDF = 1123;
	exports.ER_UDF_NO_PATHS = 1124;
	exports.ER_UDF_EXISTS = 1125;
	exports.ER_CANT_OPEN_LIBRARY = 1126;
	exports.ER_CANT_FIND_DL_ENTRY = 1127;
	exports.ER_FUNCTION_NOT_DEFINED = 1128;
	exports.ER_HOST_IS_BLOCKED = 1129;
	exports.ER_HOST_NOT_PRIVILEGED = 1130;
	exports.ER_PASSWORD_ANONYMOUS_USER = 1131;
	exports.ER_PASSWORD_NOT_ALLOWED = 1132;
	exports.ER_PASSWORD_NO_MATCH = 1133;
	exports.ER_UPDATE_INFO = 1134;
	exports.ER_CANT_CREATE_THREAD = 1135;
	exports.ER_WRONG_VALUE_COUNT_ON_ROW = 1136;
	exports.ER_CANT_REOPEN_TABLE = 1137;
	exports.ER_INVALID_USE_OF_NULL = 1138;
	exports.ER_REGEXP_ERROR = 1139;
	exports.ER_MIX_OF_GROUP_FUNC_AND_FIELDS = 1140;
	exports.ER_NONEXISTING_GRANT = 1141;
	exports.ER_TABLEACCESS_DENIED_ERROR = 1142;
	exports.ER_COLUMNACCESS_DENIED_ERROR = 1143;
	exports.ER_ILLEGAL_GRANT_FOR_TABLE = 1144;
	exports.ER_GRANT_WRONG_HOST_OR_USER = 1145;
	exports.ER_NO_SUCH_TABLE = 1146;
	exports.ER_NONEXISTING_TABLE_GRANT = 1147;
	exports.ER_NOT_ALLOWED_COMMAND = 1148;
	exports.ER_SYNTAX_ERROR = 1149;
	exports.ER_UNUSED1 = 1150;
	exports.ER_UNUSED2 = 1151;
	exports.ER_ABORTING_CONNECTION = 1152;
	exports.ER_NET_PACKET_TOO_LARGE = 1153;
	exports.ER_NET_READ_ERROR_FROM_PIPE = 1154;
	exports.ER_NET_FCNTL_ERROR = 1155;
	exports.ER_NET_PACKETS_OUT_OF_ORDER = 1156;
	exports.ER_NET_UNCOMPRESS_ERROR = 1157;
	exports.ER_NET_READ_ERROR = 1158;
	exports.ER_NET_READ_INTERRUPTED = 1159;
	exports.ER_NET_ERROR_ON_WRITE = 1160;
	exports.ER_NET_WRITE_INTERRUPTED = 1161;
	exports.ER_TOO_LONG_STRING = 1162;
	exports.ER_TABLE_CANT_HANDLE_BLOB = 1163;
	exports.ER_TABLE_CANT_HANDLE_AUTO_INCREMENT = 1164;
	exports.ER_UNUSED3 = 1165;
	exports.ER_WRONG_COLUMN_NAME = 1166;
	exports.ER_WRONG_KEY_COLUMN = 1167;
	exports.ER_WRONG_MRG_TABLE = 1168;
	exports.ER_DUP_UNIQUE = 1169;
	exports.ER_BLOB_KEY_WITHOUT_LENGTH = 1170;
	exports.ER_PRIMARY_CANT_HAVE_NULL = 1171;
	exports.ER_TOO_MANY_ROWS = 1172;
	exports.ER_REQUIRES_PRIMARY_KEY = 1173;
	exports.ER_NO_RAID_COMPILED = 1174;
	exports.ER_UPDATE_WITHOUT_KEY_IN_SAFE_MODE = 1175;
	exports.ER_KEY_DOES_NOT_EXITS = 1176;
	exports.ER_CHECK_NO_SUCH_TABLE = 1177;
	exports.ER_CHECK_NOT_IMPLEMENTED = 1178;
	exports.ER_CANT_DO_THIS_DURING_AN_TRANSACTION = 1179;
	exports.ER_ERROR_DURING_COMMIT = 1180;
	exports.ER_ERROR_DURING_ROLLBACK = 1181;
	exports.ER_ERROR_DURING_FLUSH_LOGS = 1182;
	exports.ER_ERROR_DURING_CHECKPOINT = 1183;
	exports.ER_NEW_ABORTING_CONNECTION = 1184;
	exports.ER_DUMP_NOT_IMPLEMENTED = 1185;
	exports.ER_FLUSH_MASTER_BINLOG_CLOSED = 1186;
	exports.ER_INDEX_REBUILD = 1187;
	exports.ER_SOURCE = 1188;
	exports.ER_SOURCE_NET_READ = 1189;
	exports.ER_SOURCE_NET_WRITE = 1190;
	exports.ER_FT_MATCHING_KEY_NOT_FOUND = 1191;
	exports.ER_LOCK_OR_ACTIVE_TRANSACTION = 1192;
	exports.ER_UNKNOWN_SYSTEM_VARIABLE = 1193;
	exports.ER_CRASHED_ON_USAGE = 1194;
	exports.ER_CRASHED_ON_REPAIR = 1195;
	exports.ER_WARNING_NOT_COMPLETE_ROLLBACK = 1196;
	exports.ER_TRANS_CACHE_FULL = 1197;
	exports.ER_SLAVE_MUST_STOP = 1198;
	exports.ER_REPLICA_NOT_RUNNING = 1199;
	exports.ER_BAD_REPLICA = 1200;
	exports.ER_CONNECTION_METADATA = 1201;
	exports.ER_REPLICA_THREAD = 1202;
	exports.ER_TOO_MANY_USER_CONNECTIONS = 1203;
	exports.ER_SET_CONSTANTS_ONLY = 1204;
	exports.ER_LOCK_WAIT_TIMEOUT = 1205;
	exports.ER_LOCK_TABLE_FULL = 1206;
	exports.ER_READ_ONLY_TRANSACTION = 1207;
	exports.ER_DROP_DB_WITH_READ_LOCK = 1208;
	exports.ER_CREATE_DB_WITH_READ_LOCK = 1209;
	exports.ER_WRONG_ARGUMENTS = 1210;
	exports.ER_NO_PERMISSION_TO_CREATE_USER = 1211;
	exports.ER_UNION_TABLES_IN_DIFFERENT_DIR = 1212;
	exports.ER_LOCK_DEADLOCK = 1213;
	exports.ER_TABLE_CANT_HANDLE_FT = 1214;
	exports.ER_CANNOT_ADD_FOREIGN = 1215;
	exports.ER_NO_REFERENCED_ROW = 1216;
	exports.ER_ROW_IS_REFERENCED = 1217;
	exports.ER_CONNECT_TO_SOURCE = 1218;
	exports.ER_QUERY_ON_MASTER = 1219;
	exports.ER_ERROR_WHEN_EXECUTING_COMMAND = 1220;
	exports.ER_WRONG_USAGE = 1221;
	exports.ER_WRONG_NUMBER_OF_COLUMNS_IN_SELECT = 1222;
	exports.ER_CANT_UPDATE_WITH_READLOCK = 1223;
	exports.ER_MIXING_NOT_ALLOWED = 1224;
	exports.ER_DUP_ARGUMENT = 1225;
	exports.ER_USER_LIMIT_REACHED = 1226;
	exports.ER_SPECIFIC_ACCESS_DENIED_ERROR = 1227;
	exports.ER_LOCAL_VARIABLE = 1228;
	exports.ER_GLOBAL_VARIABLE = 1229;
	exports.ER_NO_DEFAULT = 1230;
	exports.ER_WRONG_VALUE_FOR_VAR = 1231;
	exports.ER_WRONG_TYPE_FOR_VAR = 1232;
	exports.ER_VAR_CANT_BE_READ = 1233;
	exports.ER_CANT_USE_OPTION_HERE = 1234;
	exports.ER_NOT_SUPPORTED_YET = 1235;
	exports.ER_SOURCE_FATAL_ERROR_READING_BINLOG = 1236;
	exports.ER_REPLICA_IGNORED_TABLE = 1237;
	exports.ER_INCORRECT_GLOBAL_LOCAL_VAR = 1238;
	exports.ER_WRONG_FK_DEF = 1239;
	exports.ER_KEY_REF_DO_NOT_MATCH_TABLE_REF = 1240;
	exports.ER_OPERAND_COLUMNS = 1241;
	exports.ER_SUBQUERY_NO_1_ROW = 1242;
	exports.ER_UNKNOWN_STMT_HANDLER = 1243;
	exports.ER_CORRUPT_HELP_DB = 1244;
	exports.ER_CYCLIC_REFERENCE = 1245;
	exports.ER_AUTO_CONVERT = 1246;
	exports.ER_ILLEGAL_REFERENCE = 1247;
	exports.ER_DERIVED_MUST_HAVE_ALIAS = 1248;
	exports.ER_SELECT_REDUCED = 1249;
	exports.ER_TABLENAME_NOT_ALLOWED_HERE = 1250;
	exports.ER_NOT_SUPPORTED_AUTH_MODE = 1251;
	exports.ER_SPATIAL_CANT_HAVE_NULL = 1252;
	exports.ER_COLLATION_CHARSET_MISMATCH = 1253;
	exports.ER_SLAVE_WAS_RUNNING = 1254;
	exports.ER_SLAVE_WAS_NOT_RUNNING = 1255;
	exports.ER_TOO_BIG_FOR_UNCOMPRESS = 1256;
	exports.ER_ZLIB_Z_MEM_ERROR = 1257;
	exports.ER_ZLIB_Z_BUF_ERROR = 1258;
	exports.ER_ZLIB_Z_DATA_ERROR = 1259;
	exports.ER_CUT_VALUE_GROUP_CONCAT = 1260;
	exports.ER_WARN_TOO_FEW_RECORDS = 1261;
	exports.ER_WARN_TOO_MANY_RECORDS = 1262;
	exports.ER_WARN_NULL_TO_NOTNULL = 1263;
	exports.ER_WARN_DATA_OUT_OF_RANGE = 1264;
	exports.WARN_DATA_TRUNCATED = 1265;
	exports.ER_WARN_USING_OTHER_HANDLER = 1266;
	exports.ER_CANT_AGGREGATE_2COLLATIONS = 1267;
	exports.ER_DROP_USER = 1268;
	exports.ER_REVOKE_GRANTS = 1269;
	exports.ER_CANT_AGGREGATE_3COLLATIONS = 1270;
	exports.ER_CANT_AGGREGATE_NCOLLATIONS = 1271;
	exports.ER_VARIABLE_IS_NOT_STRUCT = 1272;
	exports.ER_UNKNOWN_COLLATION = 1273;
	exports.ER_REPLICA_IGNORED_SSL_PARAMS = 1274;
	exports.ER_SERVER_IS_IN_SECURE_AUTH_MODE = 1275;
	exports.ER_WARN_FIELD_RESOLVED = 1276;
	exports.ER_BAD_REPLICA_UNTIL_COND = 1277;
	exports.ER_MISSING_SKIP_REPLICA = 1278;
	exports.ER_UNTIL_COND_IGNORED = 1279;
	exports.ER_WRONG_NAME_FOR_INDEX = 1280;
	exports.ER_WRONG_NAME_FOR_CATALOG = 1281;
	exports.ER_WARN_QC_RESIZE = 1282;
	exports.ER_BAD_FT_COLUMN = 1283;
	exports.ER_UNKNOWN_KEY_CACHE = 1284;
	exports.ER_WARN_HOSTNAME_WONT_WORK = 1285;
	exports.ER_UNKNOWN_STORAGE_ENGINE = 1286;
	exports.ER_WARN_DEPRECATED_SYNTAX = 1287;
	exports.ER_NON_UPDATABLE_TABLE = 1288;
	exports.ER_FEATURE_DISABLED = 1289;
	exports.ER_OPTION_PREVENTS_STATEMENT = 1290;
	exports.ER_DUPLICATED_VALUE_IN_TYPE = 1291;
	exports.ER_TRUNCATED_WRONG_VALUE = 1292;
	exports.ER_TOO_MUCH_AUTO_TIMESTAMP_COLS = 1293;
	exports.ER_INVALID_ON_UPDATE = 1294;
	exports.ER_UNSUPPORTED_PS = 1295;
	exports.ER_GET_ERRMSG = 1296;
	exports.ER_GET_TEMPORARY_ERRMSG = 1297;
	exports.ER_UNKNOWN_TIME_ZONE = 1298;
	exports.ER_WARN_INVALID_TIMESTAMP = 1299;
	exports.ER_INVALID_CHARACTER_STRING = 1300;
	exports.ER_WARN_ALLOWED_PACKET_OVERFLOWED = 1301;
	exports.ER_CONFLICTING_DECLARATIONS = 1302;
	exports.ER_SP_NO_RECURSIVE_CREATE = 1303;
	exports.ER_SP_ALREADY_EXISTS = 1304;
	exports.ER_SP_DOES_NOT_EXIST = 1305;
	exports.ER_SP_DROP_FAILED = 1306;
	exports.ER_SP_STORE_FAILED = 1307;
	exports.ER_SP_LILABEL_MISMATCH = 1308;
	exports.ER_SP_LABEL_REDEFINE = 1309;
	exports.ER_SP_LABEL_MISMATCH = 1310;
	exports.ER_SP_UNINIT_VAR = 1311;
	exports.ER_SP_BADSELECT = 1312;
	exports.ER_SP_BADRETURN = 1313;
	exports.ER_SP_BADSTATEMENT = 1314;
	exports.ER_UPDATE_LOG_DEPRECATED_IGNORED = 1315;
	exports.ER_UPDATE_LOG_DEPRECATED_TRANSLATED = 1316;
	exports.ER_QUERY_INTERRUPTED = 1317;
	exports.ER_SP_WRONG_NO_OF_ARGS = 1318;
	exports.ER_SP_COND_MISMATCH = 1319;
	exports.ER_SP_NORETURN = 1320;
	exports.ER_SP_NORETURNEND = 1321;
	exports.ER_SP_BAD_CURSOR_QUERY = 1322;
	exports.ER_SP_BAD_CURSOR_SELECT = 1323;
	exports.ER_SP_CURSOR_MISMATCH = 1324;
	exports.ER_SP_CURSOR_ALREADY_OPEN = 1325;
	exports.ER_SP_CURSOR_NOT_OPEN = 1326;
	exports.ER_SP_UNDECLARED_VAR = 1327;
	exports.ER_SP_WRONG_NO_OF_FETCH_ARGS = 1328;
	exports.ER_SP_FETCH_NO_DATA = 1329;
	exports.ER_SP_DUP_PARAM = 1330;
	exports.ER_SP_DUP_VAR = 1331;
	exports.ER_SP_DUP_COND = 1332;
	exports.ER_SP_DUP_CURS = 1333;
	exports.ER_SP_CANT_ALTER = 1334;
	exports.ER_SP_SUBSELECT_NYI = 1335;
	exports.ER_STMT_NOT_ALLOWED_IN_SF_OR_TRG = 1336;
	exports.ER_SP_VARCOND_AFTER_CURSHNDLR = 1337;
	exports.ER_SP_CURSOR_AFTER_HANDLER = 1338;
	exports.ER_SP_CASE_NOT_FOUND = 1339;
	exports.ER_FPARSER_TOO_BIG_FILE = 1340;
	exports.ER_FPARSER_BAD_HEADER = 1341;
	exports.ER_FPARSER_EOF_IN_COMMENT = 1342;
	exports.ER_FPARSER_ERROR_IN_PARAMETER = 1343;
	exports.ER_FPARSER_EOF_IN_UNKNOWN_PARAMETER = 1344;
	exports.ER_VIEW_NO_EXPLAIN = 1345;
	exports.ER_FRM_UNKNOWN_TYPE = 1346;
	exports.ER_WRONG_OBJECT = 1347;
	exports.ER_NONUPDATEABLE_COLUMN = 1348;
	exports.ER_VIEW_SELECT_DERIVED = 1349;
	exports.ER_VIEW_SELECT_CLAUSE = 1350;
	exports.ER_VIEW_SELECT_VARIABLE = 1351;
	exports.ER_VIEW_SELECT_TMPTABLE = 1352;
	exports.ER_VIEW_WRONG_LIST = 1353;
	exports.ER_WARN_VIEW_MERGE = 1354;
	exports.ER_WARN_VIEW_WITHOUT_KEY = 1355;
	exports.ER_VIEW_INVALID = 1356;
	exports.ER_SP_NO_DROP_SP = 1357;
	exports.ER_SP_GOTO_IN_HNDLR = 1358;
	exports.ER_TRG_ALREADY_EXISTS = 1359;
	exports.ER_TRG_DOES_NOT_EXIST = 1360;
	exports.ER_TRG_ON_VIEW_OR_TEMP_TABLE = 1361;
	exports.ER_TRG_CANT_CHANGE_ROW = 1362;
	exports.ER_TRG_NO_SUCH_ROW_IN_TRG = 1363;
	exports.ER_NO_DEFAULT_FOR_FIELD = 1364;
	exports.ER_DIVISION_BY_ZERO = 1365;
	exports.ER_TRUNCATED_WRONG_VALUE_FOR_FIELD = 1366;
	exports.ER_ILLEGAL_VALUE_FOR_TYPE = 1367;
	exports.ER_VIEW_NONUPD_CHECK = 1368;
	exports.ER_VIEW_CHECK_FAILED = 1369;
	exports.ER_PROCACCESS_DENIED_ERROR = 1370;
	exports.ER_RELAY_LOG_FAIL = 1371;
	exports.ER_PASSWD_LENGTH = 1372;
	exports.ER_UNKNOWN_TARGET_BINLOG = 1373;
	exports.ER_IO_ERR_LOG_INDEX_READ = 1374;
	exports.ER_BINLOG_PURGE_PROHIBITED = 1375;
	exports.ER_FSEEK_FAIL = 1376;
	exports.ER_BINLOG_PURGE_FATAL_ERR = 1377;
	exports.ER_LOG_IN_USE = 1378;
	exports.ER_LOG_PURGE_UNKNOWN_ERR = 1379;
	exports.ER_RELAY_LOG_INIT = 1380;
	exports.ER_NO_BINARY_LOGGING = 1381;
	exports.ER_RESERVED_SYNTAX = 1382;
	exports.ER_WSAS_FAILED = 1383;
	exports.ER_DIFF_GROUPS_PROC = 1384;
	exports.ER_NO_GROUP_FOR_PROC = 1385;
	exports.ER_ORDER_WITH_PROC = 1386;
	exports.ER_LOGGING_PROHIBIT_CHANGING_OF = 1387;
	exports.ER_NO_FILE_MAPPING = 1388;
	exports.ER_WRONG_MAGIC = 1389;
	exports.ER_PS_MANY_PARAM = 1390;
	exports.ER_KEY_PART_0 = 1391;
	exports.ER_VIEW_CHECKSUM = 1392;
	exports.ER_VIEW_MULTIUPDATE = 1393;
	exports.ER_VIEW_NO_INSERT_FIELD_LIST = 1394;
	exports.ER_VIEW_DELETE_MERGE_VIEW = 1395;
	exports.ER_CANNOT_USER = 1396;
	exports.ER_XAER_NOTA = 1397;
	exports.ER_XAER_INVAL = 1398;
	exports.ER_XAER_RMFAIL = 1399;
	exports.ER_XAER_OUTSIDE = 1400;
	exports.ER_XAER_RMERR = 1401;
	exports.ER_XA_RBROLLBACK = 1402;
	exports.ER_NONEXISTING_PROC_GRANT = 1403;
	exports.ER_PROC_AUTO_GRANT_FAIL = 1404;
	exports.ER_PROC_AUTO_REVOKE_FAIL = 1405;
	exports.ER_DATA_TOO_LONG = 1406;
	exports.ER_SP_BAD_SQLSTATE = 1407;
	exports.ER_STARTUP = 1408;
	exports.ER_LOAD_FROM_FIXED_SIZE_ROWS_TO_VAR = 1409;
	exports.ER_CANT_CREATE_USER_WITH_GRANT = 1410;
	exports.ER_WRONG_VALUE_FOR_TYPE = 1411;
	exports.ER_TABLE_DEF_CHANGED = 1412;
	exports.ER_SP_DUP_HANDLER = 1413;
	exports.ER_SP_NOT_VAR_ARG = 1414;
	exports.ER_SP_NO_RETSET = 1415;
	exports.ER_CANT_CREATE_GEOMETRY_OBJECT = 1416;
	exports.ER_FAILED_ROUTINE_BREAK_BINLOG = 1417;
	exports.ER_BINLOG_UNSAFE_ROUTINE = 1418;
	exports.ER_BINLOG_CREATE_ROUTINE_NEED_SUPER = 1419;
	exports.ER_EXEC_STMT_WITH_OPEN_CURSOR = 1420;
	exports.ER_STMT_HAS_NO_OPEN_CURSOR = 1421;
	exports.ER_COMMIT_NOT_ALLOWED_IN_SF_OR_TRG = 1422;
	exports.ER_NO_DEFAULT_FOR_VIEW_FIELD = 1423;
	exports.ER_SP_NO_RECURSION = 1424;
	exports.ER_TOO_BIG_SCALE = 1425;
	exports.ER_TOO_BIG_PRECISION = 1426;
	exports.ER_M_BIGGER_THAN_D = 1427;
	exports.ER_WRONG_LOCK_OF_SYSTEM_TABLE = 1428;
	exports.ER_CONNECT_TO_FOREIGN_DATA_SOURCE = 1429;
	exports.ER_QUERY_ON_FOREIGN_DATA_SOURCE = 1430;
	exports.ER_FOREIGN_DATA_SOURCE_DOESNT_EXIST = 1431;
	exports.ER_FOREIGN_DATA_STRING_INVALID_CANT_CREATE = 1432;
	exports.ER_FOREIGN_DATA_STRING_INVALID = 1433;
	exports.ER_CANT_CREATE_FEDERATED_TABLE = 1434;
	exports.ER_TRG_IN_WRONG_SCHEMA = 1435;
	exports.ER_STACK_OVERRUN_NEED_MORE = 1436;
	exports.ER_TOO_LONG_BODY = 1437;
	exports.ER_WARN_CANT_DROP_DEFAULT_KEYCACHE = 1438;
	exports.ER_TOO_BIG_DISPLAYWIDTH = 1439;
	exports.ER_XAER_DUPID = 1440;
	exports.ER_DATETIME_FUNCTION_OVERFLOW = 1441;
	exports.ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG = 1442;
	exports.ER_VIEW_PREVENT_UPDATE = 1443;
	exports.ER_PS_NO_RECURSION = 1444;
	exports.ER_SP_CANT_SET_AUTOCOMMIT = 1445;
	exports.ER_MALFORMED_DEFINER = 1446;
	exports.ER_VIEW_FRM_NO_USER = 1447;
	exports.ER_VIEW_OTHER_USER = 1448;
	exports.ER_NO_SUCH_USER = 1449;
	exports.ER_FORBID_SCHEMA_CHANGE = 1450;
	exports.ER_ROW_IS_REFERENCED_2 = 1451;
	exports.ER_NO_REFERENCED_ROW_2 = 1452;
	exports.ER_SP_BAD_VAR_SHADOW = 1453;
	exports.ER_TRG_NO_DEFINER = 1454;
	exports.ER_OLD_FILE_FORMAT = 1455;
	exports.ER_SP_RECURSION_LIMIT = 1456;
	exports.ER_SP_PROC_TABLE_CORRUPT = 1457;
	exports.ER_SP_WRONG_NAME = 1458;
	exports.ER_TABLE_NEEDS_UPGRADE = 1459;
	exports.ER_SP_NO_AGGREGATE = 1460;
	exports.ER_MAX_PREPARED_STMT_COUNT_REACHED = 1461;
	exports.ER_VIEW_RECURSIVE = 1462;
	exports.ER_NON_GROUPING_FIELD_USED = 1463;
	exports.ER_TABLE_CANT_HANDLE_SPKEYS = 1464;
	exports.ER_NO_TRIGGERS_ON_SYSTEM_SCHEMA = 1465;
	exports.ER_REMOVED_SPACES = 1466;
	exports.ER_AUTOINC_READ_FAILED = 1467;
	exports.ER_USERNAME = 1468;
	exports.ER_HOSTNAME = 1469;
	exports.ER_WRONG_STRING_LENGTH = 1470;
	exports.ER_NON_INSERTABLE_TABLE = 1471;
	exports.ER_ADMIN_WRONG_MRG_TABLE = 1472;
	exports.ER_TOO_HIGH_LEVEL_OF_NESTING_FOR_SELECT = 1473;
	exports.ER_NAME_BECOMES_EMPTY = 1474;
	exports.ER_AMBIGUOUS_FIELD_TERM = 1475;
	exports.ER_FOREIGN_SERVER_EXISTS = 1476;
	exports.ER_FOREIGN_SERVER_DOESNT_EXIST = 1477;
	exports.ER_ILLEGAL_HA_CREATE_OPTION = 1478;
	exports.ER_PARTITION_REQUIRES_VALUES_ERROR = 1479;
	exports.ER_PARTITION_WRONG_VALUES_ERROR = 1480;
	exports.ER_PARTITION_MAXVALUE_ERROR = 1481;
	exports.ER_PARTITION_SUBPARTITION_ERROR = 1482;
	exports.ER_PARTITION_SUBPART_MIX_ERROR = 1483;
	exports.ER_PARTITION_WRONG_NO_PART_ERROR = 1484;
	exports.ER_PARTITION_WRONG_NO_SUBPART_ERROR = 1485;
	exports.ER_WRONG_EXPR_IN_PARTITION_FUNC_ERROR = 1486;
	exports.ER_NO_CONST_EXPR_IN_RANGE_OR_LIST_ERROR = 1487;
	exports.ER_FIELD_NOT_FOUND_PART_ERROR = 1488;
	exports.ER_LIST_OF_FIELDS_ONLY_IN_HASH_ERROR = 1489;
	exports.ER_INCONSISTENT_PARTITION_INFO_ERROR = 1490;
	exports.ER_PARTITION_FUNC_NOT_ALLOWED_ERROR = 1491;
	exports.ER_PARTITIONS_MUST_BE_DEFINED_ERROR = 1492;
	exports.ER_RANGE_NOT_INCREASING_ERROR = 1493;
	exports.ER_INCONSISTENT_TYPE_OF_FUNCTIONS_ERROR = 1494;
	exports.ER_MULTIPLE_DEF_CONST_IN_LIST_PART_ERROR = 1495;
	exports.ER_PARTITION_ENTRY_ERROR = 1496;
	exports.ER_MIX_HANDLER_ERROR = 1497;
	exports.ER_PARTITION_NOT_DEFINED_ERROR = 1498;
	exports.ER_TOO_MANY_PARTITIONS_ERROR = 1499;
	exports.ER_SUBPARTITION_ERROR = 1500;
	exports.ER_CANT_CREATE_HANDLER_FILE = 1501;
	exports.ER_BLOB_FIELD_IN_PART_FUNC_ERROR = 1502;
	exports.ER_UNIQUE_KEY_NEED_ALL_FIELDS_IN_PF = 1503;
	exports.ER_NO_PARTS_ERROR = 1504;
	exports.ER_PARTITION_MGMT_ON_NONPARTITIONED = 1505;
	exports.ER_FOREIGN_KEY_ON_PARTITIONED = 1506;
	exports.ER_DROP_PARTITION_NON_EXISTENT = 1507;
	exports.ER_DROP_LAST_PARTITION = 1508;
	exports.ER_COALESCE_ONLY_ON_HASH_PARTITION = 1509;
	exports.ER_REORG_HASH_ONLY_ON_SAME_NO = 1510;
	exports.ER_REORG_NO_PARAM_ERROR = 1511;
	exports.ER_ONLY_ON_RANGE_LIST_PARTITION = 1512;
	exports.ER_ADD_PARTITION_SUBPART_ERROR = 1513;
	exports.ER_ADD_PARTITION_NO_NEW_PARTITION = 1514;
	exports.ER_COALESCE_PARTITION_NO_PARTITION = 1515;
	exports.ER_REORG_PARTITION_NOT_EXIST = 1516;
	exports.ER_SAME_NAME_PARTITION = 1517;
	exports.ER_NO_BINLOG_ERROR = 1518;
	exports.ER_CONSECUTIVE_REORG_PARTITIONS = 1519;
	exports.ER_REORG_OUTSIDE_RANGE = 1520;
	exports.ER_PARTITION_FUNCTION_FAILURE = 1521;
	exports.ER_PART_STATE_ERROR = 1522;
	exports.ER_LIMITED_PART_RANGE = 1523;
	exports.ER_PLUGIN_IS_NOT_LOADED = 1524;
	exports.ER_WRONG_VALUE = 1525;
	exports.ER_NO_PARTITION_FOR_GIVEN_VALUE = 1526;
	exports.ER_FILEGROUP_OPTION_ONLY_ONCE = 1527;
	exports.ER_CREATE_FILEGROUP_FAILED = 1528;
	exports.ER_DROP_FILEGROUP_FAILED = 1529;
	exports.ER_TABLESPACE_AUTO_EXTEND_ERROR = 1530;
	exports.ER_WRONG_SIZE_NUMBER = 1531;
	exports.ER_SIZE_OVERFLOW_ERROR = 1532;
	exports.ER_ALTER_FILEGROUP_FAILED = 1533;
	exports.ER_BINLOG_ROW_LOGGING_FAILED = 1534;
	exports.ER_BINLOG_ROW_WRONG_TABLE_DEF = 1535;
	exports.ER_BINLOG_ROW_RBR_TO_SBR = 1536;
	exports.ER_EVENT_ALREADY_EXISTS = 1537;
	exports.ER_EVENT_STORE_FAILED = 1538;
	exports.ER_EVENT_DOES_NOT_EXIST = 1539;
	exports.ER_EVENT_CANT_ALTER = 1540;
	exports.ER_EVENT_DROP_FAILED = 1541;
	exports.ER_EVENT_INTERVAL_NOT_POSITIVE_OR_TOO_BIG = 1542;
	exports.ER_EVENT_ENDS_BEFORE_STARTS = 1543;
	exports.ER_EVENT_EXEC_TIME_IN_THE_PAST = 1544;
	exports.ER_EVENT_OPEN_TABLE_FAILED = 1545;
	exports.ER_EVENT_NEITHER_M_EXPR_NOR_M_AT = 1546;
	exports.ER_COL_COUNT_DOESNT_MATCH_CORRUPTED = 1547;
	exports.ER_CANNOT_LOAD_FROM_TABLE = 1548;
	exports.ER_EVENT_CANNOT_DELETE = 1549;
	exports.ER_EVENT_COMPILE_ERROR = 1550;
	exports.ER_EVENT_SAME_NAME = 1551;
	exports.ER_EVENT_DATA_TOO_LONG = 1552;
	exports.ER_DROP_INDEX_FK = 1553;
	exports.ER_WARN_DEPRECATED_SYNTAX_WITH_VER = 1554;
	exports.ER_CANT_WRITE_LOCK_LOG_TABLE = 1555;
	exports.ER_CANT_LOCK_LOG_TABLE = 1556;
	exports.ER_FOREIGN_DUPLICATE_KEY = 1557;
	exports.ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE = 1558;
	exports.ER_TEMP_TABLE_PREVENTS_SWITCH_OUT_OF_RBR = 1559;
	exports.ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_FORMAT = 1560;
	exports.ER_NDB_CANT_SWITCH_BINLOG_FORMAT = 1561;
	exports.ER_PARTITION_NO_TEMPORARY = 1562;
	exports.ER_PARTITION_CONST_DOMAIN_ERROR = 1563;
	exports.ER_PARTITION_FUNCTION_IS_NOT_ALLOWED = 1564;
	exports.ER_DDL_LOG_ERROR = 1565;
	exports.ER_NULL_IN_VALUES_LESS_THAN = 1566;
	exports.ER_WRONG_PARTITION_NAME = 1567;
	exports.ER_CANT_CHANGE_TX_CHARACTERISTICS = 1568;
	exports.ER_DUP_ENTRY_AUTOINCREMENT_CASE = 1569;
	exports.ER_EVENT_MODIFY_QUEUE_ERROR = 1570;
	exports.ER_EVENT_SET_VAR_ERROR = 1571;
	exports.ER_PARTITION_MERGE_ERROR = 1572;
	exports.ER_CANT_ACTIVATE_LOG = 1573;
	exports.ER_RBR_NOT_AVAILABLE = 1574;
	exports.ER_BASE64_DECODE_ERROR = 1575;
	exports.ER_EVENT_RECURSION_FORBIDDEN = 1576;
	exports.ER_EVENTS_DB_ERROR = 1577;
	exports.ER_ONLY_INTEGERS_ALLOWED = 1578;
	exports.ER_UNSUPORTED_LOG_ENGINE = 1579;
	exports.ER_BAD_LOG_STATEMENT = 1580;
	exports.ER_CANT_RENAME_LOG_TABLE = 1581;
	exports.ER_WRONG_PARAMCOUNT_TO_NATIVE_FCT = 1582;
	exports.ER_WRONG_PARAMETERS_TO_NATIVE_FCT = 1583;
	exports.ER_WRONG_PARAMETERS_TO_STORED_FCT = 1584;
	exports.ER_NATIVE_FCT_NAME_COLLISION = 1585;
	exports.ER_DUP_ENTRY_WITH_KEY_NAME = 1586;
	exports.ER_BINLOG_PURGE_EMFILE = 1587;
	exports.ER_EVENT_CANNOT_CREATE_IN_THE_PAST = 1588;
	exports.ER_EVENT_CANNOT_ALTER_IN_THE_PAST = 1589;
	exports.ER_SLAVE_INCIDENT = 1590;
	exports.ER_NO_PARTITION_FOR_GIVEN_VALUE_SILENT = 1591;
	exports.ER_BINLOG_UNSAFE_STATEMENT = 1592;
	exports.ER_BINLOG_FATAL_ERROR = 1593;
	exports.ER_SLAVE_RELAY_LOG_READ_FAILURE = 1594;
	exports.ER_SLAVE_RELAY_LOG_WRITE_FAILURE = 1595;
	exports.ER_SLAVE_CREATE_EVENT_FAILURE = 1596;
	exports.ER_SLAVE_MASTER_COM_FAILURE = 1597;
	exports.ER_BINLOG_LOGGING_IMPOSSIBLE = 1598;
	exports.ER_VIEW_NO_CREATION_CTX = 1599;
	exports.ER_VIEW_INVALID_CREATION_CTX = 1600;
	exports.ER_SR_INVALID_CREATION_CTX = 1601;
	exports.ER_TRG_CORRUPTED_FILE = 1602;
	exports.ER_TRG_NO_CREATION_CTX = 1603;
	exports.ER_TRG_INVALID_CREATION_CTX = 1604;
	exports.ER_EVENT_INVALID_CREATION_CTX = 1605;
	exports.ER_TRG_CANT_OPEN_TABLE = 1606;
	exports.ER_CANT_CREATE_SROUTINE = 1607;
	exports.ER_NEVER_USED = 1608;
	exports.ER_NO_FORMAT_DESCRIPTION_EVENT_BEFORE_BINLOG_STATEMENT = 1609;
	exports.ER_REPLICA_CORRUPT_EVENT = 1610;
	exports.ER_LOAD_DATA_INVALID_COLUMN = 1611;
	exports.ER_LOG_PURGE_NO_FILE = 1612;
	exports.ER_XA_RBTIMEOUT = 1613;
	exports.ER_XA_RBDEADLOCK = 1614;
	exports.ER_NEED_REPREPARE = 1615;
	exports.ER_DELAYED_NOT_SUPPORTED = 1616;
	exports.WARN_NO_CONNECTION_METADATA = 1617;
	exports.WARN_OPTION_IGNORED = 1618;
	exports.ER_PLUGIN_DELETE_BUILTIN = 1619;
	exports.WARN_PLUGIN_BUSY = 1620;
	exports.ER_VARIABLE_IS_READONLY = 1621;
	exports.ER_WARN_ENGINE_TRANSACTION_ROLLBACK = 1622;
	exports.ER_SLAVE_HEARTBEAT_FAILURE = 1623;
	exports.ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE = 1624;
	exports.ER_NDB_REPLICATION_SCHEMA_ERROR = 1625;
	exports.ER_CONFLICT_FN_PARSE_ERROR = 1626;
	exports.ER_EXCEPTIONS_WRITE_ERROR = 1627;
	exports.ER_TOO_LONG_TABLE_COMMENT = 1628;
	exports.ER_TOO_LONG_FIELD_COMMENT = 1629;
	exports.ER_FUNC_INEXISTENT_NAME_COLLISION = 1630;
	exports.ER_DATABASE_NAME = 1631;
	exports.ER_TABLE_NAME = 1632;
	exports.ER_PARTITION_NAME = 1633;
	exports.ER_SUBPARTITION_NAME = 1634;
	exports.ER_TEMPORARY_NAME = 1635;
	exports.ER_RENAMED_NAME = 1636;
	exports.ER_TOO_MANY_CONCURRENT_TRXS = 1637;
	exports.WARN_NON_ASCII_SEPARATOR_NOT_IMPLEMENTED = 1638;
	exports.ER_DEBUG_SYNC_TIMEOUT = 1639;
	exports.ER_DEBUG_SYNC_HIT_LIMIT = 1640;
	exports.ER_DUP_SIGNAL_SET = 1641;
	exports.ER_SIGNAL_WARN = 1642;
	exports.ER_SIGNAL_NOT_FOUND = 1643;
	exports.ER_SIGNAL_EXCEPTION = 1644;
	exports.ER_RESIGNAL_WITHOUT_ACTIVE_HANDLER = 1645;
	exports.ER_SIGNAL_BAD_CONDITION_TYPE = 1646;
	exports.WARN_COND_ITEM_TRUNCATED = 1647;
	exports.ER_COND_ITEM_TOO_LONG = 1648;
	exports.ER_UNKNOWN_LOCALE = 1649;
	exports.ER_REPLICA_IGNORE_SERVER_IDS = 1650;
	exports.ER_QUERY_CACHE_DISABLED = 1651;
	exports.ER_SAME_NAME_PARTITION_FIELD = 1652;
	exports.ER_PARTITION_COLUMN_LIST_ERROR = 1653;
	exports.ER_WRONG_TYPE_COLUMN_VALUE_ERROR = 1654;
	exports.ER_TOO_MANY_PARTITION_FUNC_FIELDS_ERROR = 1655;
	exports.ER_MAXVALUE_IN_VALUES_IN = 1656;
	exports.ER_TOO_MANY_VALUES_ERROR = 1657;
	exports.ER_ROW_SINGLE_PARTITION_FIELD_ERROR = 1658;
	exports.ER_FIELD_TYPE_NOT_ALLOWED_AS_PARTITION_FIELD = 1659;
	exports.ER_PARTITION_FIELDS_TOO_LONG = 1660;
	exports.ER_BINLOG_ROW_ENGINE_AND_STMT_ENGINE = 1661;
	exports.ER_BINLOG_ROW_MODE_AND_STMT_ENGINE = 1662;
	exports.ER_BINLOG_UNSAFE_AND_STMT_ENGINE = 1663;
	exports.ER_BINLOG_ROW_INJECTION_AND_STMT_ENGINE = 1664;
	exports.ER_BINLOG_STMT_MODE_AND_ROW_ENGINE = 1665;
	exports.ER_BINLOG_ROW_INJECTION_AND_STMT_MODE = 1666;
	exports.ER_BINLOG_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE = 1667;
	exports.ER_BINLOG_UNSAFE_LIMIT = 1668;
	exports.ER_UNUSED4 = 1669;
	exports.ER_BINLOG_UNSAFE_SYSTEM_TABLE = 1670;
	exports.ER_BINLOG_UNSAFE_AUTOINC_COLUMNS = 1671;
	exports.ER_BINLOG_UNSAFE_UDF = 1672;
	exports.ER_BINLOG_UNSAFE_SYSTEM_VARIABLE = 1673;
	exports.ER_BINLOG_UNSAFE_SYSTEM_FUNCTION = 1674;
	exports.ER_BINLOG_UNSAFE_NONTRANS_AFTER_TRANS = 1675;
	exports.ER_MESSAGE_AND_STATEMENT = 1676;
	exports.ER_SLAVE_CONVERSION_FAILED = 1677;
	exports.ER_REPLICA_CANT_CREATE_CONVERSION = 1678;
	exports.ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_FORMAT = 1679;
	exports.ER_PATH_LENGTH = 1680;
	exports.ER_WARN_DEPRECATED_SYNTAX_NO_REPLACEMENT = 1681;
	exports.ER_WRONG_NATIVE_TABLE_STRUCTURE = 1682;
	exports.ER_WRONG_PERFSCHEMA_USAGE = 1683;
	exports.ER_WARN_I_S_SKIPPED_TABLE = 1684;
	exports.ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_DIRECT = 1685;
	exports.ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_DIRECT = 1686;
	exports.ER_SPATIAL_MUST_HAVE_GEOM_COL = 1687;
	exports.ER_TOO_LONG_INDEX_COMMENT = 1688;
	exports.ER_LOCK_ABORTED = 1689;
	exports.ER_DATA_OUT_OF_RANGE = 1690;
	exports.ER_WRONG_SPVAR_TYPE_IN_LIMIT = 1691;
	exports.ER_BINLOG_UNSAFE_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE = 1692;
	exports.ER_BINLOG_UNSAFE_MIXED_STATEMENT = 1693;
	exports.ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_SQL_LOG_BIN = 1694;
	exports.ER_STORED_FUNCTION_PREVENTS_SWITCH_SQL_LOG_BIN = 1695;
	exports.ER_FAILED_READ_FROM_PAR_FILE = 1696;
	exports.ER_VALUES_IS_NOT_INT_TYPE_ERROR = 1697;
	exports.ER_ACCESS_DENIED_NO_PASSWORD_ERROR = 1698;
	exports.ER_SET_PASSWORD_AUTH_PLUGIN = 1699;
	exports.ER_GRANT_PLUGIN_USER_EXISTS = 1700;
	exports.ER_TRUNCATE_ILLEGAL_FK = 1701;
	exports.ER_PLUGIN_IS_PERMANENT = 1702;
	exports.ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MIN = 1703;
	exports.ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MAX = 1704;
	exports.ER_STMT_CACHE_FULL = 1705;
	exports.ER_MULTI_UPDATE_KEY_CONFLICT = 1706;
	exports.ER_TABLE_NEEDS_REBUILD = 1707;
	exports.WARN_OPTION_BELOW_LIMIT = 1708;
	exports.ER_INDEX_COLUMN_TOO_LONG = 1709;
	exports.ER_ERROR_IN_TRIGGER_BODY = 1710;
	exports.ER_ERROR_IN_UNKNOWN_TRIGGER_BODY = 1711;
	exports.ER_INDEX_CORRUPT = 1712;
	exports.ER_UNDO_RECORD_TOO_BIG = 1713;
	exports.ER_BINLOG_UNSAFE_INSERT_IGNORE_SELECT = 1714;
	exports.ER_BINLOG_UNSAFE_INSERT_SELECT_UPDATE = 1715;
	exports.ER_BINLOG_UNSAFE_REPLACE_SELECT = 1716;
	exports.ER_BINLOG_UNSAFE_CREATE_IGNORE_SELECT = 1717;
	exports.ER_BINLOG_UNSAFE_CREATE_REPLACE_SELECT = 1718;
	exports.ER_BINLOG_UNSAFE_UPDATE_IGNORE = 1719;
	exports.ER_PLUGIN_NO_UNINSTALL = 1720;
	exports.ER_PLUGIN_NO_INSTALL = 1721;
	exports.ER_BINLOG_UNSAFE_WRITE_AUTOINC_SELECT = 1722;
	exports.ER_BINLOG_UNSAFE_CREATE_SELECT_AUTOINC = 1723;
	exports.ER_BINLOG_UNSAFE_INSERT_TWO_KEYS = 1724;
	exports.ER_TABLE_IN_FK_CHECK = 1725;
	exports.ER_UNSUPPORTED_ENGINE = 1726;
	exports.ER_BINLOG_UNSAFE_AUTOINC_NOT_FIRST = 1727;
	exports.ER_CANNOT_LOAD_FROM_TABLE_V2 = 1728;
	exports.ER_SOURCE_DELAY_VALUE_OUT_OF_RANGE = 1729;
	exports.ER_ONLY_FD_AND_RBR_EVENTS_ALLOWED_IN_BINLOG_STATEMENT = 1730;
	exports.ER_PARTITION_EXCHANGE_DIFFERENT_OPTION = 1731;
	exports.ER_PARTITION_EXCHANGE_PART_TABLE = 1732;
	exports.ER_PARTITION_EXCHANGE_TEMP_TABLE = 1733;
	exports.ER_PARTITION_INSTEAD_OF_SUBPARTITION = 1734;
	exports.ER_UNKNOWN_PARTITION = 1735;
	exports.ER_TABLES_DIFFERENT_METADATA = 1736;
	exports.ER_ROW_DOES_NOT_MATCH_PARTITION = 1737;
	exports.ER_BINLOG_CACHE_SIZE_GREATER_THAN_MAX = 1738;
	exports.ER_WARN_INDEX_NOT_APPLICABLE = 1739;
	exports.ER_PARTITION_EXCHANGE_FOREIGN_KEY = 1740;
	exports.ER_NO_SUCH_KEY_VALUE = 1741;
	exports.ER_RPL_INFO_DATA_TOO_LONG = 1742;
	exports.ER_NETWORK_READ_EVENT_CHECKSUM_FAILURE = 1743;
	exports.ER_BINLOG_READ_EVENT_CHECKSUM_FAILURE = 1744;
	exports.ER_BINLOG_STMT_CACHE_SIZE_GREATER_THAN_MAX = 1745;
	exports.ER_CANT_UPDATE_TABLE_IN_CREATE_TABLE_SELECT = 1746;
	exports.ER_PARTITION_CLAUSE_ON_NONPARTITIONED = 1747;
	exports.ER_ROW_DOES_NOT_MATCH_GIVEN_PARTITION_SET = 1748;
	exports.ER_NO_SUCH_PARTITION = 1749;
	exports.ER_CHANGE_RPL_INFO_REPOSITORY_FAILURE = 1750;
	exports.ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_CREATED_TEMP_TABLE = 1751;
	exports.ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_DROPPED_TEMP_TABLE = 1752;
	exports.ER_MTA_FEATURE_IS_NOT_SUPPORTED = 1753;
	exports.ER_MTA_UPDATED_DBS_GREATER_MAX = 1754;
	exports.ER_MTA_CANT_PARALLEL = 1755;
	exports.ER_MTA_INCONSISTENT_DATA = 1756;
	exports.ER_FULLTEXT_NOT_SUPPORTED_WITH_PARTITIONING = 1757;
	exports.ER_DA_INVALID_CONDITION_NUMBER = 1758;
	exports.ER_INSECURE_PLAIN_TEXT = 1759;
	exports.ER_INSECURE_CHANGE_SOURCE = 1760;
	exports.ER_FOREIGN_DUPLICATE_KEY_WITH_CHILD_INFO = 1761;
	exports.ER_FOREIGN_DUPLICATE_KEY_WITHOUT_CHILD_INFO = 1762;
	exports.ER_SQLTHREAD_WITH_SECURE_REPLICA = 1763;
	exports.ER_TABLE_HAS_NO_FT = 1764;
	exports.ER_VARIABLE_NOT_SETTABLE_IN_SF_OR_TRIGGER = 1765;
	exports.ER_VARIABLE_NOT_SETTABLE_IN_TRANSACTION = 1766;
	exports.ER_GTID_NEXT_IS_NOT_IN_GTID_NEXT_LIST = 1767;
	exports.ER_CANT_CHANGE_GTID_NEXT_IN_TRANSACTION = 1768;
	exports.ER_SET_STATEMENT_CANNOT_INVOKE_FUNCTION = 1769;
	exports.ER_GTID_NEXT_CANT_BE_AUTOMATIC_IF_GTID_NEXT_LIST_IS_NON_NULL = 1770;
	exports.ER_SKIPPING_LOGGED_TRANSACTION = 1771;
	exports.ER_MALFORMED_GTID_SET_SPECIFICATION = 1772;
	exports.ER_MALFORMED_GTID_SET_ENCODING = 1773;
	exports.ER_MALFORMED_GTID_SPECIFICATION = 1774;
	exports.ER_GNO_EXHAUSTED = 1775;
	exports.ER_BAD_REPLICA_AUTO_POSITION = 1776;
	exports.ER_AUTO_POSITION_REQUIRES_GTID_MODE_NOT_OFF = 1777;
	exports.ER_CANT_DO_IMPLICIT_COMMIT_IN_TRX_WHEN_GTID_NEXT_IS_SET = 1778;
	exports.ER_GTID_MODE_ON_REQUIRES_ENFORCE_GTID_CONSISTENCY_ON = 1779;
	exports.ER_GTID_MODE_REQUIRES_BINLOG = 1780;
	exports.ER_CANT_SET_GTID_NEXT_TO_GTID_WHEN_GTID_MODE_IS_OFF = 1781;
	exports.ER_CANT_SET_GTID_NEXT_TO_ANONYMOUS_WHEN_GTID_MODE_IS_ON = 1782;
	exports.ER_CANT_SET_GTID_NEXT_LIST_TO_NON_NULL_WHEN_GTID_MODE_IS_OFF = 1783;
	exports.ER_FOUND_GTID_EVENT_WHEN_GTID_MODE_IS_OFF = 1784;
	exports.ER_GTID_UNSAFE_NON_TRANSACTIONAL_TABLE = 1785;
	exports.ER_GTID_UNSAFE_CREATE_SELECT = 1786;
	exports.ER_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRANSACTION = 1787;
	exports.ER_GTID_MODE_CAN_ONLY_CHANGE_ONE_STEP_AT_A_TIME = 1788;
	exports.ER_SOURCE_HAS_PURGED_REQUIRED_GTIDS = 1789;
	exports.ER_CANT_SET_GTID_NEXT_WHEN_OWNING_GTID = 1790;
	exports.ER_UNKNOWN_EXPLAIN_FORMAT = 1791;
	exports.ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION = 1792;
	exports.ER_TOO_LONG_TABLE_PARTITION_COMMENT = 1793;
	exports.ER_REPLICA_CONFIGURATION = 1794;
	exports.ER_INNODB_FT_LIMIT = 1795;
	exports.ER_INNODB_NO_FT_TEMP_TABLE = 1796;
	exports.ER_INNODB_FT_WRONG_DOCID_COLUMN = 1797;
	exports.ER_INNODB_FT_WRONG_DOCID_INDEX = 1798;
	exports.ER_INNODB_ONLINE_LOG_TOO_BIG = 1799;
	exports.ER_UNKNOWN_ALTER_ALGORITHM = 1800;
	exports.ER_UNKNOWN_ALTER_LOCK = 1801;
	exports.ER_MTA_CHANGE_SOURCE_CANT_RUN_WITH_GAPS = 1802;
	exports.ER_MTA_RECOVERY_FAILURE = 1803;
	exports.ER_MTA_RESET_WORKERS = 1804;
	exports.ER_COL_COUNT_DOESNT_MATCH_CORRUPTED_V2 = 1805;
	exports.ER_REPLICA_SILENT_RETRY_TRANSACTION = 1806;
	exports.ER_DISCARD_FK_CHECKS_RUNNING = 1807;
	exports.ER_TABLE_SCHEMA_MISMATCH = 1808;
	exports.ER_TABLE_IN_SYSTEM_TABLESPACE = 1809;
	exports.ER_IO_READ_ERROR = 1810;
	exports.ER_IO_WRITE_ERROR = 1811;
	exports.ER_TABLESPACE_MISSING = 1812;
	exports.ER_TABLESPACE_EXISTS = 1813;
	exports.ER_TABLESPACE_DISCARDED = 1814;
	exports.ER_INTERNAL_ERROR = 1815;
	exports.ER_INNODB_IMPORT_ERROR = 1816;
	exports.ER_INNODB_INDEX_CORRUPT = 1817;
	exports.ER_INVALID_YEAR_COLUMN_LENGTH = 1818;
	exports.ER_NOT_VALID_PASSWORD = 1819;
	exports.ER_MUST_CHANGE_PASSWORD = 1820;
	exports.ER_FK_NO_INDEX_CHILD = 1821;
	exports.ER_FK_NO_INDEX_PARENT = 1822;
	exports.ER_FK_FAIL_ADD_SYSTEM = 1823;
	exports.ER_FK_CANNOT_OPEN_PARENT = 1824;
	exports.ER_FK_INCORRECT_OPTION = 1825;
	exports.ER_FK_DUP_NAME = 1826;
	exports.ER_PASSWORD_FORMAT = 1827;
	exports.ER_FK_COLUMN_CANNOT_DROP = 1828;
	exports.ER_FK_COLUMN_CANNOT_DROP_CHILD = 1829;
	exports.ER_FK_COLUMN_NOT_NULL = 1830;
	exports.ER_DUP_INDEX = 1831;
	exports.ER_FK_COLUMN_CANNOT_CHANGE = 1832;
	exports.ER_FK_COLUMN_CANNOT_CHANGE_CHILD = 1833;
	exports.ER_UNUSED5 = 1834;
	exports.ER_MALFORMED_PACKET = 1835;
	exports.ER_READ_ONLY_MODE = 1836;
	exports.ER_GTID_NEXT_TYPE_UNDEFINED_GTID = 1837;
	exports.ER_VARIABLE_NOT_SETTABLE_IN_SP = 1838;
	exports.ER_CANT_SET_GTID_PURGED_WHEN_GTID_MODE_IS_OFF = 1839;
	exports.ER_CANT_SET_GTID_PURGED_WHEN_GTID_EXECUTED_IS_NOT_EMPTY = 1840;
	exports.ER_CANT_SET_GTID_PURGED_WHEN_OWNED_GTIDS_IS_NOT_EMPTY = 1841;
	exports.ER_GTID_PURGED_WAS_CHANGED = 1842;
	exports.ER_GTID_EXECUTED_WAS_CHANGED = 1843;
	exports.ER_BINLOG_STMT_MODE_AND_NO_REPL_TABLES = 1844;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED = 1845;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON = 1846;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COPY = 1847;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_PARTITION = 1848;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_RENAME = 1849;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE = 1850;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_CHECK = 1851;
	exports.ER_UNUSED6 = 1852;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOPK = 1853;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_AUTOINC = 1854;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_HIDDEN_FTS = 1855;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_CHANGE_FTS = 1856;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FTS = 1857;
	exports.ER_SQL_REPLICA_SKIP_COUNTER_NOT_SETTABLE_IN_GTID_MODE = 1858;
	exports.ER_DUP_UNKNOWN_IN_INDEX = 1859;
	exports.ER_IDENT_CAUSES_TOO_LONG_PATH = 1860;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOT_NULL = 1861;
	exports.ER_MUST_CHANGE_PASSWORD_LOGIN = 1862;
	exports.ER_ROW_IN_WRONG_PARTITION = 1863;
	exports.ER_MTA_EVENT_BIGGER_PENDING_JOBS_SIZE_MAX = 1864;
	exports.ER_INNODB_NO_FT_USES_PARSER = 1865;
	exports.ER_BINLOG_LOGICAL_CORRUPTION = 1866;
	exports.ER_WARN_PURGE_LOG_IN_USE = 1867;
	exports.ER_WARN_PURGE_LOG_IS_ACTIVE = 1868;
	exports.ER_AUTO_INCREMENT_CONFLICT = 1869;
	exports.WARN_ON_BLOCKHOLE_IN_RBR = 1870;
	exports.ER_REPLICA_CM_INIT_REPOSITORY = 1871;
	exports.ER_REPLICA_AM_INIT_REPOSITORY = 1872;
	exports.ER_ACCESS_DENIED_CHANGE_USER_ERROR = 1873;
	exports.ER_INNODB_READ_ONLY = 1874;
	exports.ER_STOP_REPLICA_SQL_THREAD_TIMEOUT = 1875;
	exports.ER_STOP_REPLICA_IO_THREAD_TIMEOUT = 1876;
	exports.ER_TABLE_CORRUPT = 1877;
	exports.ER_TEMP_FILE_WRITE_FAILURE = 1878;
	exports.ER_INNODB_FT_AUX_NOT_HEX_ID = 1879;
	exports.ER_OLD_TEMPORALS_UPGRADED = 1880;
	exports.ER_INNODB_FORCED_RECOVERY = 1881;
	exports.ER_AES_INVALID_IV = 1882;
	exports.ER_PLUGIN_CANNOT_BE_UNINSTALLED = 1883;
	exports.ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_ASSIGNED_GTID = 1884;
	exports.ER_REPLICA_HAS_MORE_GTIDS_THAN_SOURCE = 1885;
	exports.ER_MISSING_KEY = 1886;
	exports.WARN_NAMED_PIPE_ACCESS_EVERYONE = 1887;
	exports.ER_FILE_CORRUPT = 3000;
	exports.ER_ERROR_ON_SOURCE = 3001;
	exports.ER_INCONSISTENT_ERROR = 3002;
	exports.ER_STORAGE_ENGINE_NOT_LOADED = 3003;
	exports.ER_GET_STACKED_DA_WITHOUT_ACTIVE_HANDLER = 3004;
	exports.ER_WARN_LEGACY_SYNTAX_CONVERTED = 3005;
	exports.ER_BINLOG_UNSAFE_FULLTEXT_PLUGIN = 3006;
	exports.ER_CANNOT_DISCARD_TEMPORARY_TABLE = 3007;
	exports.ER_FK_DEPTH_EXCEEDED = 3008;
	exports.ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE_V2 = 3009;
	exports.ER_WARN_TRIGGER_DOESNT_HAVE_CREATED = 3010;
	exports.ER_REFERENCED_TRG_DOES_NOT_EXIST = 3011;
	exports.ER_EXPLAIN_NOT_SUPPORTED = 3012;
	exports.ER_INVALID_FIELD_SIZE = 3013;
	exports.ER_MISSING_HA_CREATE_OPTION = 3014;
	exports.ER_ENGINE_OUT_OF_MEMORY = 3015;
	exports.ER_PASSWORD_EXPIRE_ANONYMOUS_USER = 3016;
	exports.ER_REPLICA_SQL_THREAD_MUST_STOP = 3017;
	exports.ER_NO_FT_MATERIALIZED_SUBQUERY = 3018;
	exports.ER_INNODB_UNDO_LOG_FULL = 3019;
	exports.ER_INVALID_ARGUMENT_FOR_LOGARITHM = 3020;
	exports.ER_REPLICA_CHANNEL_IO_THREAD_MUST_STOP = 3021;
	exports.ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO = 3022;
	exports.ER_WARN_ONLY_SOURCE_LOG_FILE_NO_POS = 3023;
	exports.ER_QUERY_TIMEOUT = 3024;
	exports.ER_NON_RO_SELECT_DISABLE_TIMER = 3025;
	exports.ER_DUP_LIST_ENTRY = 3026;
	exports.ER_SQL_MODE_NO_EFFECT = 3027;
	exports.ER_AGGREGATE_ORDER_FOR_UNION = 3028;
	exports.ER_AGGREGATE_ORDER_NON_AGG_QUERY = 3029;
	exports.ER_REPLICA_WORKER_STOPPED_PREVIOUS_THD_ERROR = 3030;
	exports.ER_DONT_SUPPORT_REPLICA_PRESERVE_COMMIT_ORDER = 3031;
	exports.ER_SERVER_OFFLINE_MODE = 3032;
	exports.ER_GIS_DIFFERENT_SRIDS = 3033;
	exports.ER_GIS_UNSUPPORTED_ARGUMENT = 3034;
	exports.ER_GIS_UNKNOWN_ERROR = 3035;
	exports.ER_GIS_UNKNOWN_EXCEPTION = 3036;
	exports.ER_GIS_INVALID_DATA = 3037;
	exports.ER_BOOST_GEOMETRY_EMPTY_INPUT_EXCEPTION = 3038;
	exports.ER_BOOST_GEOMETRY_CENTROID_EXCEPTION = 3039;
	exports.ER_BOOST_GEOMETRY_OVERLAY_INVALID_INPUT_EXCEPTION = 3040;
	exports.ER_BOOST_GEOMETRY_TURN_INFO_EXCEPTION = 3041;
	exports.ER_BOOST_GEOMETRY_SELF_INTERSECTION_POINT_EXCEPTION = 3042;
	exports.ER_BOOST_GEOMETRY_UNKNOWN_EXCEPTION = 3043;
	exports.ER_STD_BAD_ALLOC_ERROR = 3044;
	exports.ER_STD_DOMAIN_ERROR = 3045;
	exports.ER_STD_LENGTH_ERROR = 3046;
	exports.ER_STD_INVALID_ARGUMENT = 3047;
	exports.ER_STD_OUT_OF_RANGE_ERROR = 3048;
	exports.ER_STD_OVERFLOW_ERROR = 3049;
	exports.ER_STD_RANGE_ERROR = 3050;
	exports.ER_STD_UNDERFLOW_ERROR = 3051;
	exports.ER_STD_LOGIC_ERROR = 3052;
	exports.ER_STD_RUNTIME_ERROR = 3053;
	exports.ER_STD_UNKNOWN_EXCEPTION = 3054;
	exports.ER_GIS_DATA_WRONG_ENDIANESS = 3055;
	exports.ER_CHANGE_SOURCE_PASSWORD_LENGTH = 3056;
	exports.ER_USER_LOCK_WRONG_NAME = 3057;
	exports.ER_USER_LOCK_DEADLOCK = 3058;
	exports.ER_REPLACE_INACCESSIBLE_ROWS = 3059;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_GIS = 3060;
	exports.ER_ILLEGAL_USER_VAR = 3061;
	exports.ER_GTID_MODE_OFF = 3062;
	exports.ER_UNSUPPORTED_BY_REPLICATION_THREAD = 3063;
	exports.ER_INCORRECT_TYPE = 3064;
	exports.ER_FIELD_IN_ORDER_NOT_SELECT = 3065;
	exports.ER_AGGREGATE_IN_ORDER_NOT_SELECT = 3066;
	exports.ER_INVALID_RPL_WILD_TABLE_FILTER_PATTERN = 3067;
	exports.ER_NET_OK_PACKET_TOO_LARGE = 3068;
	exports.ER_INVALID_JSON_DATA = 3069;
	exports.ER_INVALID_GEOJSON_MISSING_MEMBER = 3070;
	exports.ER_INVALID_GEOJSON_WRONG_TYPE = 3071;
	exports.ER_INVALID_GEOJSON_UNSPECIFIED = 3072;
	exports.ER_DIMENSION_UNSUPPORTED = 3073;
	exports.ER_REPLICA_CHANNEL_DOES_NOT_EXIST = 3074;
	exports.ER_SLAVE_MULTIPLE_CHANNELS_HOST_PORT = 3075;
	exports.ER_REPLICA_CHANNEL_NAME_INVALID_OR_TOO_LONG = 3076;
	exports.ER_REPLICA_NEW_CHANNEL_WRONG_REPOSITORY = 3077;
	exports.ER_SLAVE_CHANNEL_DELETE = 3078;
	exports.ER_REPLICA_MULTIPLE_CHANNELS_CMD = 3079;
	exports.ER_REPLICA_MAX_CHANNELS_EXCEEDED = 3080;
	exports.ER_REPLICA_CHANNEL_MUST_STOP = 3081;
	exports.ER_REPLICA_CHANNEL_NOT_RUNNING = 3082;
	exports.ER_REPLICA_CHANNEL_WAS_RUNNING = 3083;
	exports.ER_REPLICA_CHANNEL_WAS_NOT_RUNNING = 3084;
	exports.ER_REPLICA_CHANNEL_SQL_THREAD_MUST_STOP = 3085;
	exports.ER_REPLICA_CHANNEL_SQL_SKIP_COUNTER = 3086;
	exports.ER_WRONG_FIELD_WITH_GROUP_V2 = 3087;
	exports.ER_MIX_OF_GROUP_FUNC_AND_FIELDS_V2 = 3088;
	exports.ER_WARN_DEPRECATED_SYSVAR_UPDATE = 3089;
	exports.ER_WARN_DEPRECATED_SQLMODE = 3090;
	exports.ER_CANNOT_LOG_PARTIAL_DROP_DATABASE_WITH_GTID = 3091;
	exports.ER_GROUP_REPLICATION_CONFIGURATION = 3092;
	exports.ER_GROUP_REPLICATION_RUNNING = 3093;
	exports.ER_GROUP_REPLICATION_APPLIER_INIT_ERROR = 3094;
	exports.ER_GROUP_REPLICATION_STOP_APPLIER_THREAD_TIMEOUT = 3095;
	exports.ER_GROUP_REPLICATION_COMMUNICATION_LAYER_SESSION_ERROR = 3096;
	exports.ER_GROUP_REPLICATION_COMMUNICATION_LAYER_JOIN_ERROR = 3097;
	exports.ER_BEFORE_DML_VALIDATION_ERROR = 3098;
	exports.ER_PREVENTS_VARIABLE_WITHOUT_RBR = 3099;
	exports.ER_RUN_HOOK_ERROR = 3100;
	exports.ER_TRANSACTION_ROLLBACK_DURING_COMMIT = 3101;
	exports.ER_GENERATED_COLUMN_FUNCTION_IS_NOT_ALLOWED = 3102;
	exports.ER_UNSUPPORTED_ALTER_INPLACE_ON_VIRTUAL_COLUMN = 3103;
	exports.ER_WRONG_FK_OPTION_FOR_GENERATED_COLUMN = 3104;
	exports.ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN = 3105;
	exports.ER_UNSUPPORTED_ACTION_ON_GENERATED_COLUMN = 3106;
	exports.ER_GENERATED_COLUMN_NON_PRIOR = 3107;
	exports.ER_DEPENDENT_BY_GENERATED_COLUMN = 3108;
	exports.ER_GENERATED_COLUMN_REF_AUTO_INC = 3109;
	exports.ER_FEATURE_NOT_AVAILABLE = 3110;
	exports.ER_CANT_SET_GTID_MODE = 3111;
	exports.ER_CANT_USE_AUTO_POSITION_WITH_GTID_MODE_OFF = 3112;
	exports.ER_CANT_REPLICATE_ANONYMOUS_WITH_AUTO_POSITION = 3113;
	exports.ER_CANT_REPLICATE_ANONYMOUS_WITH_GTID_MODE_ON = 3114;
	exports.ER_CANT_REPLICATE_GTID_WITH_GTID_MODE_OFF = 3115;
	exports.ER_CANT_ENFORCE_GTID_CONSISTENCY_WITH_ONGOING_GTID_VIOLATING_TX = 3116;
	exports.ER_ENFORCE_GTID_CONSISTENCY_WARN_WITH_ONGOING_GTID_VIOLATING_TX = 3117;
	exports.ER_ACCOUNT_HAS_BEEN_LOCKED = 3118;
	exports.ER_WRONG_TABLESPACE_NAME = 3119;
	exports.ER_TABLESPACE_IS_NOT_EMPTY = 3120;
	exports.ER_WRONG_FILE_NAME = 3121;
	exports.ER_BOOST_GEOMETRY_INCONSISTENT_TURNS_EXCEPTION = 3122;
	exports.ER_WARN_OPTIMIZER_HINT_SYNTAX_ERROR = 3123;
	exports.ER_WARN_BAD_MAX_EXECUTION_TIME = 3124;
	exports.ER_WARN_UNSUPPORTED_MAX_EXECUTION_TIME = 3125;
	exports.ER_WARN_CONFLICTING_HINT = 3126;
	exports.ER_WARN_UNKNOWN_QB_NAME = 3127;
	exports.ER_UNRESOLVED_HINT_NAME = 3128;
	exports.ER_WARN_ON_MODIFYING_GTID_EXECUTED_TABLE = 3129;
	exports.ER_PLUGGABLE_PROTOCOL_COMMAND_NOT_SUPPORTED = 3130;
	exports.ER_LOCKING_SERVICE_WRONG_NAME = 3131;
	exports.ER_LOCKING_SERVICE_DEADLOCK = 3132;
	exports.ER_LOCKING_SERVICE_TIMEOUT = 3133;
	exports.ER_GIS_MAX_POINTS_IN_GEOMETRY_OVERFLOWED = 3134;
	exports.ER_SQL_MODE_MERGED = 3135;
	exports.ER_VTOKEN_PLUGIN_TOKEN_MISMATCH = 3136;
	exports.ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND = 3137;
	exports.ER_CANT_SET_VARIABLE_WHEN_OWNING_GTID = 3138;
	exports.ER_REPLICA_CHANNEL_OPERATION_NOT_ALLOWED = 3139;
	exports.ER_INVALID_JSON_TEXT = 3140;
	exports.ER_INVALID_JSON_TEXT_IN_PARAM = 3141;
	exports.ER_INVALID_JSON_BINARY_DATA = 3142;
	exports.ER_INVALID_JSON_PATH = 3143;
	exports.ER_INVALID_JSON_CHARSET = 3144;
	exports.ER_INVALID_JSON_CHARSET_IN_FUNCTION = 3145;
	exports.ER_INVALID_TYPE_FOR_JSON = 3146;
	exports.ER_INVALID_CAST_TO_JSON = 3147;
	exports.ER_INVALID_JSON_PATH_CHARSET = 3148;
	exports.ER_INVALID_JSON_PATH_WILDCARD = 3149;
	exports.ER_JSON_VALUE_TOO_BIG = 3150;
	exports.ER_JSON_KEY_TOO_BIG = 3151;
	exports.ER_JSON_USED_AS_KEY = 3152;
	exports.ER_JSON_VACUOUS_PATH = 3153;
	exports.ER_JSON_BAD_ONE_OR_ALL_ARG = 3154;
	exports.ER_NUMERIC_JSON_VALUE_OUT_OF_RANGE = 3155;
	exports.ER_INVALID_JSON_VALUE_FOR_CAST = 3156;
	exports.ER_JSON_DOCUMENT_TOO_DEEP = 3157;
	exports.ER_JSON_DOCUMENT_NULL_KEY = 3158;
	exports.ER_SECURE_TRANSPORT_REQUIRED = 3159;
	exports.ER_NO_SECURE_TRANSPORTS_CONFIGURED = 3160;
	exports.ER_DISABLED_STORAGE_ENGINE = 3161;
	exports.ER_USER_DOES_NOT_EXIST = 3162;
	exports.ER_USER_ALREADY_EXISTS = 3163;
	exports.ER_AUDIT_API_ABORT = 3164;
	exports.ER_INVALID_JSON_PATH_ARRAY_CELL = 3165;
	exports.ER_BUFPOOL_RESIZE_INPROGRESS = 3166;
	exports.ER_FEATURE_DISABLED_SEE_DOC = 3167;
	exports.ER_SERVER_ISNT_AVAILABLE = 3168;
	exports.ER_SESSION_WAS_KILLED = 3169;
	exports.ER_CAPACITY_EXCEEDED = 3170;
	exports.ER_CAPACITY_EXCEEDED_IN_RANGE_OPTIMIZER = 3171;
	exports.ER_TABLE_NEEDS_UPG_PART = 3172;
	exports.ER_CANT_WAIT_FOR_EXECUTED_GTID_SET_WHILE_OWNING_A_GTID = 3173;
	exports.ER_CANNOT_ADD_FOREIGN_BASE_COL_VIRTUAL = 3174;
	exports.ER_CANNOT_CREATE_VIRTUAL_INDEX_CONSTRAINT = 3175;
	exports.ER_ERROR_ON_MODIFYING_GTID_EXECUTED_TABLE = 3176;
	exports.ER_LOCK_REFUSED_BY_ENGINE = 3177;
	exports.ER_UNSUPPORTED_ALTER_ONLINE_ON_VIRTUAL_COLUMN = 3178;
	exports.ER_MASTER_KEY_ROTATION_NOT_SUPPORTED_BY_SE = 3179;
	exports.ER_MASTER_KEY_ROTATION_ERROR_BY_SE = 3180;
	exports.ER_MASTER_KEY_ROTATION_BINLOG_FAILED = 3181;
	exports.ER_MASTER_KEY_ROTATION_SE_UNAVAILABLE = 3182;
	exports.ER_TABLESPACE_CANNOT_ENCRYPT = 3183;
	exports.ER_INVALID_ENCRYPTION_OPTION = 3184;
	exports.ER_CANNOT_FIND_KEY_IN_KEYRING = 3185;
	exports.ER_CAPACITY_EXCEEDED_IN_PARSER = 3186;
	exports.ER_UNSUPPORTED_ALTER_ENCRYPTION_INPLACE = 3187;
	exports.ER_KEYRING_UDF_KEYRING_SERVICE_ERROR = 3188;
	exports.ER_USER_COLUMN_OLD_LENGTH = 3189;
	exports.ER_CANT_RESET_SOURCE = 3190;
	exports.ER_GROUP_REPLICATION_MAX_GROUP_SIZE = 3191;
	exports.ER_CANNOT_ADD_FOREIGN_BASE_COL_STORED = 3192;
	exports.ER_TABLE_REFERENCED = 3193;
	exports.ER_PARTITION_ENGINE_DEPRECATED_FOR_TABLE = 3194;
	exports.ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID_ZERO = 3195;
	exports.ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID = 3196;
	exports.ER_XA_RETRY = 3197;
	exports.ER_KEYRING_AWS_UDF_AWS_KMS_ERROR = 3198;
	exports.ER_BINLOG_UNSAFE_XA = 3199;
	exports.ER_UDF_ERROR = 3200;
	exports.ER_KEYRING_MIGRATION_FAILURE = 3201;
	exports.ER_KEYRING_ACCESS_DENIED_ERROR = 3202;
	exports.ER_KEYRING_MIGRATION_STATUS = 3203;
	exports.ER_PLUGIN_FAILED_TO_OPEN_TABLES = 3204;
	exports.ER_PLUGIN_FAILED_TO_OPEN_TABLE = 3205;
	exports.ER_AUDIT_LOG_NO_KEYRING_PLUGIN_INSTALLED = 3206;
	exports.ER_AUDIT_LOG_ENCRYPTION_PASSWORD_HAS_NOT_BEEN_SET = 3207;
	exports.ER_AUDIT_LOG_COULD_NOT_CREATE_AES_KEY = 3208;
	exports.ER_AUDIT_LOG_ENCRYPTION_PASSWORD_CANNOT_BE_FETCHED = 3209;
	exports.ER_AUDIT_LOG_JSON_FILTERING_NOT_ENABLED = 3210;
	exports.ER_AUDIT_LOG_UDF_INSUFFICIENT_PRIVILEGE = 3211;
	exports.ER_AUDIT_LOG_SUPER_PRIVILEGE_REQUIRED = 3212;
	exports.ER_COULD_NOT_REINITIALIZE_AUDIT_LOG_FILTERS = 3213;
	exports.ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_TYPE = 3214;
	exports.ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_COUNT = 3215;
	exports.ER_AUDIT_LOG_HAS_NOT_BEEN_INSTALLED = 3216;
	exports.ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_TYPE = 3217;
	exports.ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_VALUE = 3218;
	exports.ER_AUDIT_LOG_JSON_FILTER_PARSING_ERROR = 3219;
	exports.ER_AUDIT_LOG_JSON_FILTER_NAME_CANNOT_BE_EMPTY = 3220;
	exports.ER_AUDIT_LOG_JSON_USER_NAME_CANNOT_BE_EMPTY = 3221;
	exports.ER_AUDIT_LOG_JSON_FILTER_DOES_NOT_EXISTS = 3222;
	exports.ER_AUDIT_LOG_USER_FIRST_CHARACTER_MUST_BE_ALPHANUMERIC = 3223;
	exports.ER_AUDIT_LOG_USER_NAME_INVALID_CHARACTER = 3224;
	exports.ER_AUDIT_LOG_HOST_NAME_INVALID_CHARACTER = 3225;
	exports.WARN_DEPRECATED_MAXDB_SQL_MODE_FOR_TIMESTAMP = 3226;
	exports.ER_XA_REPLICATION_FILTERS = 3227;
	exports.ER_CANT_OPEN_ERROR_LOG = 3228;
	exports.ER_GROUPING_ON_TIMESTAMP_IN_DST = 3229;
	exports.ER_CANT_START_SERVER_NAMED_PIPE = 3230;
	exports.ER_WRITE_SET_EXCEEDS_LIMIT = 3231;
	exports.ER_DEPRECATED_TLS_VERSION_SESSION_57 = 3232;
	exports.ER_WARN_DEPRECATED_TLS_VERSION_57 = 3233;
	exports.ER_WARN_WRONG_NATIVE_TABLE_STRUCTURE = 3234;
	exports.ER_AES_INVALID_KDF_NAME = 3235;
	exports.ER_AES_INVALID_KDF_ITERATIONS = 3236;
	exports.WARN_AES_KEY_SIZE = 3237;
	exports.ER_AES_INVALID_KDF_OPTION_SIZE = 3238;
	exports.ER_UNSUPPORT_COMPRESSED_TEMPORARY_TABLE = 3500;
	exports.ER_ACL_OPERATION_FAILED = 3501;
	exports.ER_UNSUPPORTED_INDEX_ALGORITHM = 3502;
	exports.ER_NO_SUCH_DB = 3503;
	exports.ER_TOO_BIG_ENUM = 3504;
	exports.ER_TOO_LONG_SET_ENUM_VALUE = 3505;
	exports.ER_INVALID_DD_OBJECT = 3506;
	exports.ER_UPDATING_DD_TABLE = 3507;
	exports.ER_INVALID_DD_OBJECT_ID = 3508;
	exports.ER_INVALID_DD_OBJECT_NAME = 3509;
	exports.ER_TABLESPACE_MISSING_WITH_NAME = 3510;
	exports.ER_TOO_LONG_ROUTINE_COMMENT = 3511;
	exports.ER_SP_LOAD_FAILED = 3512;
	exports.ER_INVALID_BITWISE_OPERANDS_SIZE = 3513;
	exports.ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE = 3514;
	exports.ER_WARN_UNSUPPORTED_HINT = 3515;
	exports.ER_UNEXPECTED_GEOMETRY_TYPE = 3516;
	exports.ER_SRS_PARSE_ERROR = 3517;
	exports.ER_SRS_PROJ_PARAMETER_MISSING = 3518;
	exports.ER_WARN_SRS_NOT_FOUND = 3519;
	exports.ER_SRS_NOT_CARTESIAN = 3520;
	exports.ER_SRS_NOT_CARTESIAN_UNDEFINED = 3521;
	exports.ER_PK_INDEX_CANT_BE_INVISIBLE = 3522;
	exports.ER_UNKNOWN_AUTHID = 3523;
	exports.ER_FAILED_ROLE_GRANT = 3524;
	exports.ER_OPEN_ROLE_TABLES = 3525;
	exports.ER_FAILED_DEFAULT_ROLES = 3526;
	exports.ER_COMPONENTS_NO_SCHEME = 3527;
	exports.ER_COMPONENTS_NO_SCHEME_SERVICE = 3528;
	exports.ER_COMPONENTS_CANT_LOAD = 3529;
	exports.ER_ROLE_NOT_GRANTED = 3530;
	exports.ER_FAILED_REVOKE_ROLE = 3531;
	exports.ER_RENAME_ROLE = 3532;
	exports.ER_COMPONENTS_CANT_ACQUIRE_SERVICE_IMPLEMENTATION = 3533;
	exports.ER_COMPONENTS_CANT_SATISFY_DEPENDENCY = 3534;
	exports.ER_COMPONENTS_LOAD_CANT_REGISTER_SERVICE_IMPLEMENTATION = 3535;
	exports.ER_COMPONENTS_LOAD_CANT_INITIALIZE = 3536;
	exports.ER_COMPONENTS_UNLOAD_NOT_LOADED = 3537;
	exports.ER_COMPONENTS_UNLOAD_CANT_DEINITIALIZE = 3538;
	exports.ER_COMPONENTS_CANT_RELEASE_SERVICE = 3539;
	exports.ER_COMPONENTS_UNLOAD_CANT_UNREGISTER_SERVICE = 3540;
	exports.ER_COMPONENTS_CANT_UNLOAD = 3541;
	exports.ER_WARN_UNLOAD_THE_NOT_PERSISTED = 3542;
	exports.ER_COMPONENT_TABLE_INCORRECT = 3543;
	exports.ER_COMPONENT_MANIPULATE_ROW_FAILED = 3544;
	exports.ER_COMPONENTS_UNLOAD_DUPLICATE_IN_GROUP = 3545;
	exports.ER_CANT_SET_GTID_PURGED_DUE_SETS_CONSTRAINTS = 3546;
	exports.ER_CANNOT_LOCK_USER_MANAGEMENT_CACHES = 3547;
	exports.ER_SRS_NOT_FOUND = 3548;
	exports.ER_VARIABLE_NOT_PERSISTED = 3549;
	exports.ER_IS_QUERY_INVALID_CLAUSE = 3550;
	exports.ER_UNABLE_TO_STORE_STATISTICS = 3551;
	exports.ER_NO_SYSTEM_SCHEMA_ACCESS = 3552;
	exports.ER_NO_SYSTEM_TABLESPACE_ACCESS = 3553;
	exports.ER_NO_SYSTEM_TABLE_ACCESS = 3554;
	exports.ER_NO_SYSTEM_TABLE_ACCESS_FOR_DICTIONARY_TABLE = 3555;
	exports.ER_NO_SYSTEM_TABLE_ACCESS_FOR_SYSTEM_TABLE = 3556;
	exports.ER_NO_SYSTEM_TABLE_ACCESS_FOR_TABLE = 3557;
	exports.ER_INVALID_OPTION_KEY = 3558;
	exports.ER_INVALID_OPTION_VALUE = 3559;
	exports.ER_INVALID_OPTION_KEY_VALUE_PAIR = 3560;
	exports.ER_INVALID_OPTION_START_CHARACTER = 3561;
	exports.ER_INVALID_OPTION_END_CHARACTER = 3562;
	exports.ER_INVALID_OPTION_CHARACTERS = 3563;
	exports.ER_DUPLICATE_OPTION_KEY = 3564;
	exports.ER_WARN_SRS_NOT_FOUND_AXIS_ORDER = 3565;
	exports.ER_NO_ACCESS_TO_NATIVE_FCT = 3566;
	exports.ER_RESET_SOURCE_TO_VALUE_OUT_OF_RANGE = 3567;
	exports.ER_UNRESOLVED_TABLE_LOCK = 3568;
	exports.ER_DUPLICATE_TABLE_LOCK = 3569;
	exports.ER_BINLOG_UNSAFE_SKIP_LOCKED = 3570;
	exports.ER_BINLOG_UNSAFE_NOWAIT = 3571;
	exports.ER_LOCK_NOWAIT = 3572;
	exports.ER_CTE_RECURSIVE_REQUIRES_UNION = 3573;
	exports.ER_CTE_RECURSIVE_REQUIRES_NONRECURSIVE_FIRST = 3574;
	exports.ER_CTE_RECURSIVE_FORBIDS_AGGREGATION = 3575;
	exports.ER_CTE_RECURSIVE_FORBIDDEN_JOIN_ORDER = 3576;
	exports.ER_CTE_RECURSIVE_REQUIRES_SINGLE_REFERENCE = 3577;
	exports.ER_SWITCH_TMP_ENGINE = 3578;
	exports.ER_WINDOW_NO_SUCH_WINDOW = 3579;
	exports.ER_WINDOW_CIRCULARITY_IN_WINDOW_GRAPH = 3580;
	exports.ER_WINDOW_NO_CHILD_PARTITIONING = 3581;
	exports.ER_WINDOW_NO_INHERIT_FRAME = 3582;
	exports.ER_WINDOW_NO_REDEFINE_ORDER_BY = 3583;
	exports.ER_WINDOW_FRAME_START_ILLEGAL = 3584;
	exports.ER_WINDOW_FRAME_END_ILLEGAL = 3585;
	exports.ER_WINDOW_FRAME_ILLEGAL = 3586;
	exports.ER_WINDOW_RANGE_FRAME_ORDER_TYPE = 3587;
	exports.ER_WINDOW_RANGE_FRAME_TEMPORAL_TYPE = 3588;
	exports.ER_WINDOW_RANGE_FRAME_NUMERIC_TYPE = 3589;
	exports.ER_WINDOW_RANGE_BOUND_NOT_CONSTANT = 3590;
	exports.ER_WINDOW_DUPLICATE_NAME = 3591;
	exports.ER_WINDOW_ILLEGAL_ORDER_BY = 3592;
	exports.ER_WINDOW_INVALID_WINDOW_FUNC_USE = 3593;
	exports.ER_WINDOW_INVALID_WINDOW_FUNC_ALIAS_USE = 3594;
	exports.ER_WINDOW_NESTED_WINDOW_FUNC_USE_IN_WINDOW_SPEC = 3595;
	exports.ER_WINDOW_ROWS_INTERVAL_USE = 3596;
	exports.ER_WINDOW_NO_GROUP_ORDER = 3597;
	exports.ER_WINDOW_EXPLAIN_JSON = 3598;
	exports.ER_WINDOW_FUNCTION_IGNORES_FRAME = 3599;
	exports.ER_WL9236_NOW = 3600;
	exports.ER_INVALID_NO_OF_ARGS = 3601;
	exports.ER_FIELD_IN_GROUPING_NOT_GROUP_BY = 3602;
	exports.ER_TOO_LONG_TABLESPACE_COMMENT = 3603;
	exports.ER_ENGINE_CANT_DROP_TABLE = 3604;
	exports.ER_ENGINE_CANT_DROP_MISSING_TABLE = 3605;
	exports.ER_TABLESPACE_DUP_FILENAME = 3606;
	exports.ER_DB_DROP_RMDIR2 = 3607;
	exports.ER_IMP_NO_FILES_MATCHED = 3608;
	exports.ER_IMP_SCHEMA_DOES_NOT_EXIST = 3609;
	exports.ER_IMP_TABLE_ALREADY_EXISTS = 3610;
	exports.ER_IMP_INCOMPATIBLE_MYSQLD_VERSION = 3611;
	exports.ER_IMP_INCOMPATIBLE_DD_VERSION = 3612;
	exports.ER_IMP_INCOMPATIBLE_SDI_VERSION = 3613;
	exports.ER_WARN_INVALID_HINT = 3614;
	exports.ER_VAR_DOES_NOT_EXIST = 3615;
	exports.ER_LONGITUDE_OUT_OF_RANGE = 3616;
	exports.ER_LATITUDE_OUT_OF_RANGE = 3617;
	exports.ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS = 3618;
	exports.ER_ILLEGAL_PRIVILEGE_LEVEL = 3619;
	exports.ER_NO_SYSTEM_VIEW_ACCESS = 3620;
	exports.ER_COMPONENT_FILTER_FLABBERGASTED = 3621;
	exports.ER_PART_EXPR_TOO_LONG = 3622;
	exports.ER_UDF_DROP_DYNAMICALLY_REGISTERED = 3623;
	exports.ER_UNABLE_TO_STORE_COLUMN_STATISTICS = 3624;
	exports.ER_UNABLE_TO_UPDATE_COLUMN_STATISTICS = 3625;
	exports.ER_UNABLE_TO_DROP_COLUMN_STATISTICS = 3626;
	exports.ER_UNABLE_TO_BUILD_HISTOGRAM = 3627;
	exports.ER_MANDATORY_ROLE = 3628;
	exports.ER_MISSING_TABLESPACE_FILE = 3629;
	exports.ER_PERSIST_ONLY_ACCESS_DENIED_ERROR = 3630;
	exports.ER_CMD_NEED_SUPER = 3631;
	exports.ER_PATH_IN_DATADIR = 3632;
	exports.ER_CLONE_DDL_IN_PROGRESS = 3633;
	exports.ER_CLONE_TOO_MANY_CONCURRENT_CLONES = 3634;
	exports.ER_APPLIER_LOG_EVENT_VALIDATION_ERROR = 3635;
	exports.ER_CTE_MAX_RECURSION_DEPTH = 3636;
	exports.ER_NOT_HINT_UPDATABLE_VARIABLE = 3637;
	exports.ER_CREDENTIALS_CONTRADICT_TO_HISTORY = 3638;
	exports.ER_WARNING_PASSWORD_HISTORY_CLAUSES_VOID = 3639;
	exports.ER_CLIENT_DOES_NOT_SUPPORT = 3640;
	exports.ER_I_S_SKIPPED_TABLESPACE = 3641;
	exports.ER_TABLESPACE_ENGINE_MISMATCH = 3642;
	exports.ER_WRONG_SRID_FOR_COLUMN = 3643;
	exports.ER_CANNOT_ALTER_SRID_DUE_TO_INDEX = 3644;
	exports.ER_WARN_BINLOG_PARTIAL_UPDATES_DISABLED = 3645;
	exports.ER_WARN_BINLOG_V1_ROW_EVENTS_DISABLED = 3646;
	exports.ER_WARN_BINLOG_PARTIAL_UPDATES_SUGGESTS_PARTIAL_IMAGES = 3647;
	exports.ER_COULD_NOT_APPLY_JSON_DIFF = 3648;
	exports.ER_CORRUPTED_JSON_DIFF = 3649;
	exports.ER_RESOURCE_GROUP_EXISTS = 3650;
	exports.ER_RESOURCE_GROUP_NOT_EXISTS = 3651;
	exports.ER_INVALID_VCPU_ID = 3652;
	exports.ER_INVALID_VCPU_RANGE = 3653;
	exports.ER_INVALID_THREAD_PRIORITY = 3654;
	exports.ER_DISALLOWED_OPERATION = 3655;
	exports.ER_RESOURCE_GROUP_BUSY = 3656;
	exports.ER_RESOURCE_GROUP_DISABLED = 3657;
	exports.ER_FEATURE_UNSUPPORTED = 3658;
	exports.ER_ATTRIBUTE_IGNORED = 3659;
	exports.ER_INVALID_THREAD_ID = 3660;
	exports.ER_RESOURCE_GROUP_BIND_FAILED = 3661;
	exports.ER_INVALID_USE_OF_FORCE_OPTION = 3662;
	exports.ER_GROUP_REPLICATION_COMMAND_FAILURE = 3663;
	exports.ER_SDI_OPERATION_FAILED = 3664;
	exports.ER_MISSING_JSON_TABLE_VALUE = 3665;
	exports.ER_WRONG_JSON_TABLE_VALUE = 3666;
	exports.ER_TF_MUST_HAVE_ALIAS = 3667;
	exports.ER_TF_FORBIDDEN_JOIN_TYPE = 3668;
	exports.ER_JT_VALUE_OUT_OF_RANGE = 3669;
	exports.ER_JT_MAX_NESTED_PATH = 3670;
	exports.ER_PASSWORD_EXPIRATION_NOT_SUPPORTED_BY_AUTH_METHOD = 3671;
	exports.ER_INVALID_GEOJSON_CRS_NOT_TOP_LEVEL = 3672;
	exports.ER_BAD_NULL_ERROR_NOT_IGNORED = 3673;
	exports.WARN_USELESS_SPATIAL_INDEX = 3674;
	exports.ER_DISK_FULL_NOWAIT = 3675;
	exports.ER_PARSE_ERROR_IN_DIGEST_FN = 3676;
	exports.ER_UNDISCLOSED_PARSE_ERROR_IN_DIGEST_FN = 3677;
	exports.ER_SCHEMA_DIR_EXISTS = 3678;
	exports.ER_SCHEMA_DIR_MISSING = 3679;
	exports.ER_SCHEMA_DIR_CREATE_FAILED = 3680;
	exports.ER_SCHEMA_DIR_UNKNOWN = 3681;
	exports.ER_ONLY_IMPLEMENTED_FOR_SRID_0_AND_4326 = 3682;
	exports.ER_BINLOG_EXPIRE_LOG_DAYS_AND_SECS_USED_TOGETHER = 3683;
	exports.ER_REGEXP_BUFFER_OVERFLOW = 3684;
	exports.ER_REGEXP_ILLEGAL_ARGUMENT = 3685;
	exports.ER_REGEXP_INDEX_OUTOFBOUNDS_ERROR = 3686;
	exports.ER_REGEXP_INTERNAL_ERROR = 3687;
	exports.ER_REGEXP_RULE_SYNTAX = 3688;
	exports.ER_REGEXP_BAD_ESCAPE_SEQUENCE = 3689;
	exports.ER_REGEXP_UNIMPLEMENTED = 3690;
	exports.ER_REGEXP_MISMATCHED_PAREN = 3691;
	exports.ER_REGEXP_BAD_INTERVAL = 3692;
	exports.ER_REGEXP_MAX_LT_MIN = 3693;
	exports.ER_REGEXP_INVALID_BACK_REF = 3694;
	exports.ER_REGEXP_LOOK_BEHIND_LIMIT = 3695;
	exports.ER_REGEXP_MISSING_CLOSE_BRACKET = 3696;
	exports.ER_REGEXP_INVALID_RANGE = 3697;
	exports.ER_REGEXP_STACK_OVERFLOW = 3698;
	exports.ER_REGEXP_TIME_OUT = 3699;
	exports.ER_REGEXP_PATTERN_TOO_BIG = 3700;
	exports.ER_CANT_SET_ERROR_LOG_SERVICE = 3701;
	exports.ER_EMPTY_PIPELINE_FOR_ERROR_LOG_SERVICE = 3702;
	exports.ER_COMPONENT_FILTER_DIAGNOSTICS = 3703;
	exports.ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS = 3704;
	exports.ER_NOT_IMPLEMENTED_FOR_PROJECTED_SRS = 3705;
	exports.ER_NONPOSITIVE_RADIUS = 3706;
	exports.ER_RESTART_SERVER_FAILED = 3707;
	exports.ER_SRS_MISSING_MANDATORY_ATTRIBUTE = 3708;
	exports.ER_SRS_MULTIPLE_ATTRIBUTE_DEFINITIONS = 3709;
	exports.ER_SRS_NAME_CANT_BE_EMPTY_OR_WHITESPACE = 3710;
	exports.ER_SRS_ORGANIZATION_CANT_BE_EMPTY_OR_WHITESPACE = 3711;
	exports.ER_SRS_ID_ALREADY_EXISTS = 3712;
	exports.ER_WARN_SRS_ID_ALREADY_EXISTS = 3713;
	exports.ER_CANT_MODIFY_SRID_0 = 3714;
	exports.ER_WARN_RESERVED_SRID_RANGE = 3715;
	exports.ER_CANT_MODIFY_SRS_USED_BY_COLUMN = 3716;
	exports.ER_SRS_INVALID_CHARACTER_IN_ATTRIBUTE = 3717;
	exports.ER_SRS_ATTRIBUTE_STRING_TOO_LONG = 3718;
	exports.ER_DEPRECATED_UTF8_ALIAS = 3719;
	exports.ER_DEPRECATED_NATIONAL = 3720;
	exports.ER_INVALID_DEFAULT_UTF8MB4_COLLATION = 3721;
	exports.ER_UNABLE_TO_COLLECT_LOG_STATUS = 3722;
	exports.ER_RESERVED_TABLESPACE_NAME = 3723;
	exports.ER_UNABLE_TO_SET_OPTION = 3724;
	exports.ER_REPLICA_POSSIBLY_DIVERGED_AFTER_DDL = 3725;
	exports.ER_SRS_NOT_GEOGRAPHIC = 3726;
	exports.ER_POLYGON_TOO_LARGE = 3727;
	exports.ER_SPATIAL_UNIQUE_INDEX = 3728;
	exports.ER_INDEX_TYPE_NOT_SUPPORTED_FOR_SPATIAL_INDEX = 3729;
	exports.ER_FK_CANNOT_DROP_PARENT = 3730;
	exports.ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE = 3731;
	exports.ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE = 3732;
	exports.ER_FK_CANNOT_USE_VIRTUAL_COLUMN = 3733;
	exports.ER_FK_NO_COLUMN_PARENT = 3734;
	exports.ER_CANT_SET_ERROR_SUPPRESSION_LIST = 3735;
	exports.ER_SRS_GEOGCS_INVALID_AXES = 3736;
	exports.ER_SRS_INVALID_SEMI_MAJOR_AXIS = 3737;
	exports.ER_SRS_INVALID_INVERSE_FLATTENING = 3738;
	exports.ER_SRS_INVALID_ANGULAR_UNIT = 3739;
	exports.ER_SRS_INVALID_PRIME_MERIDIAN = 3740;
	exports.ER_TRANSFORM_SOURCE_SRS_NOT_SUPPORTED = 3741;
	exports.ER_TRANSFORM_TARGET_SRS_NOT_SUPPORTED = 3742;
	exports.ER_TRANSFORM_SOURCE_SRS_MISSING_TOWGS84 = 3743;
	exports.ER_TRANSFORM_TARGET_SRS_MISSING_TOWGS84 = 3744;
	exports.ER_TEMP_TABLE_PREVENTS_SWITCH_SESSION_BINLOG_FORMAT = 3745;
	exports.ER_TEMP_TABLE_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT = 3746;
	exports.ER_RUNNING_APPLIER_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT = 3747;
	exports.ER_CLIENT_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRX_IN_SBR = 3748;
	exports.ER_XA_CANT_CREATE_MDL_BACKUP = 3749;
	exports.ER_TABLE_WITHOUT_PK = 3750;
	exports.ER_WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX = 3751;
	exports.ER_WARN_DATA_OUT_OF_RANGE_FUNCTIONAL_INDEX = 3752;
	exports.ER_FUNCTIONAL_INDEX_ON_JSON_OR_GEOMETRY_FUNCTION = 3753;
	exports.ER_FUNCTIONAL_INDEX_REF_AUTO_INCREMENT = 3754;
	exports.ER_CANNOT_DROP_COLUMN_FUNCTIONAL_INDEX = 3755;
	exports.ER_FUNCTIONAL_INDEX_PRIMARY_KEY = 3756;
	exports.ER_FUNCTIONAL_INDEX_ON_LOB = 3757;
	exports.ER_FUNCTIONAL_INDEX_FUNCTION_IS_NOT_ALLOWED = 3758;
	exports.ER_FULLTEXT_FUNCTIONAL_INDEX = 3759;
	exports.ER_SPATIAL_FUNCTIONAL_INDEX = 3760;
	exports.ER_WRONG_KEY_COLUMN_FUNCTIONAL_INDEX = 3761;
	exports.ER_FUNCTIONAL_INDEX_ON_FIELD = 3762;
	exports.ER_GENERATED_COLUMN_NAMED_FUNCTION_IS_NOT_ALLOWED = 3763;
	exports.ER_GENERATED_COLUMN_ROW_VALUE = 3764;
	exports.ER_GENERATED_COLUMN_VARIABLES = 3765;
	exports.ER_DEPENDENT_BY_DEFAULT_GENERATED_VALUE = 3766;
	exports.ER_DEFAULT_VAL_GENERATED_NON_PRIOR = 3767;
	exports.ER_DEFAULT_VAL_GENERATED_REF_AUTO_INC = 3768;
	exports.ER_DEFAULT_VAL_GENERATED_FUNCTION_IS_NOT_ALLOWED = 3769;
	exports.ER_DEFAULT_VAL_GENERATED_NAMED_FUNCTION_IS_NOT_ALLOWED = 3770;
	exports.ER_DEFAULT_VAL_GENERATED_ROW_VALUE = 3771;
	exports.ER_DEFAULT_VAL_GENERATED_VARIABLES = 3772;
	exports.ER_DEFAULT_AS_VAL_GENERATED = 3773;
	exports.ER_UNSUPPORTED_ACTION_ON_DEFAULT_VAL_GENERATED = 3774;
	exports.ER_GTID_UNSAFE_ALTER_ADD_COL_WITH_DEFAULT_EXPRESSION = 3775;
	exports.ER_FK_CANNOT_CHANGE_ENGINE = 3776;
	exports.ER_WARN_DEPRECATED_USER_SET_EXPR = 3777;
	exports.ER_WARN_DEPRECATED_UTF8MB3_COLLATION = 3778;
	exports.ER_WARN_DEPRECATED_NESTED_COMMENT_SYNTAX = 3779;
	exports.ER_FK_INCOMPATIBLE_COLUMNS = 3780;
	exports.ER_GR_HOLD_WAIT_TIMEOUT = 3781;
	exports.ER_GR_HOLD_KILLED = 3782;
	exports.ER_GR_HOLD_MEMBER_STATUS_ERROR = 3783;
	exports.ER_RPL_ENCRYPTION_FAILED_TO_FETCH_KEY = 3784;
	exports.ER_RPL_ENCRYPTION_KEY_NOT_FOUND = 3785;
	exports.ER_RPL_ENCRYPTION_KEYRING_INVALID_KEY = 3786;
	exports.ER_RPL_ENCRYPTION_HEADER_ERROR = 3787;
	exports.ER_RPL_ENCRYPTION_FAILED_TO_ROTATE_LOGS = 3788;
	exports.ER_RPL_ENCRYPTION_KEY_EXISTS_UNEXPECTED = 3789;
	exports.ER_RPL_ENCRYPTION_FAILED_TO_GENERATE_KEY = 3790;
	exports.ER_RPL_ENCRYPTION_FAILED_TO_STORE_KEY = 3791;
	exports.ER_RPL_ENCRYPTION_FAILED_TO_REMOVE_KEY = 3792;
	exports.ER_RPL_ENCRYPTION_UNABLE_TO_CHANGE_OPTION = 3793;
	exports.ER_RPL_ENCRYPTION_MASTER_KEY_RECOVERY_FAILED = 3794;
	exports.ER_SLOW_LOG_MODE_IGNORED_WHEN_NOT_LOGGING_TO_FILE = 3795;
	exports.ER_GRP_TRX_CONSISTENCY_NOT_ALLOWED = 3796;
	exports.ER_GRP_TRX_CONSISTENCY_BEFORE = 3797;
	exports.ER_GRP_TRX_CONSISTENCY_AFTER_ON_TRX_BEGIN = 3798;
	exports.ER_GRP_TRX_CONSISTENCY_BEGIN_NOT_ALLOWED = 3799;
	exports.ER_FUNCTIONAL_INDEX_ROW_VALUE_IS_NOT_ALLOWED = 3800;
	exports.ER_RPL_ENCRYPTION_FAILED_TO_ENCRYPT = 3801;
	exports.ER_PAGE_TRACKING_NOT_STARTED = 3802;
	exports.ER_PAGE_TRACKING_RANGE_NOT_TRACKED = 3803;
	exports.ER_PAGE_TRACKING_CANNOT_PURGE = 3804;
	exports.ER_RPL_ENCRYPTION_CANNOT_ROTATE_BINLOG_MASTER_KEY = 3805;
	exports.ER_BINLOG_MASTER_KEY_RECOVERY_OUT_OF_COMBINATION = 3806;
	exports.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_OPERATE_KEY = 3807;
	exports.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_ROTATE_LOGS = 3808;
	exports.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_REENCRYPT_LOG = 3809;
	exports.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_UNUSED_KEYS = 3810;
	exports.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_AUX_KEY = 3811;
	exports.ER_NON_BOOLEAN_EXPR_FOR_CHECK_CONSTRAINT = 3812;
	exports.ER_COLUMN_CHECK_CONSTRAINT_REFERENCES_OTHER_COLUMN = 3813;
	exports.ER_CHECK_CONSTRAINT_NAMED_FUNCTION_IS_NOT_ALLOWED = 3814;
	exports.ER_CHECK_CONSTRAINT_FUNCTION_IS_NOT_ALLOWED = 3815;
	exports.ER_CHECK_CONSTRAINT_VARIABLES = 3816;
	exports.ER_CHECK_CONSTRAINT_ROW_VALUE = 3817;
	exports.ER_CHECK_CONSTRAINT_REFERS_AUTO_INCREMENT_COLUMN = 3818;
	exports.ER_CHECK_CONSTRAINT_VIOLATED = 3819;
	exports.ER_CHECK_CONSTRAINT_REFERS_UNKNOWN_COLUMN = 3820;
	exports.ER_CHECK_CONSTRAINT_NOT_FOUND = 3821;
	exports.ER_CHECK_CONSTRAINT_DUP_NAME = 3822;
	exports.ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN = 3823;
	exports.WARN_UNENCRYPTED_TABLE_IN_ENCRYPTED_DB = 3824;
	exports.ER_INVALID_ENCRYPTION_REQUEST = 3825;
	exports.ER_CANNOT_SET_TABLE_ENCRYPTION = 3826;
	exports.ER_CANNOT_SET_DATABASE_ENCRYPTION = 3827;
	exports.ER_CANNOT_SET_TABLESPACE_ENCRYPTION = 3828;
	exports.ER_TABLESPACE_CANNOT_BE_ENCRYPTED = 3829;
	exports.ER_TABLESPACE_CANNOT_BE_DECRYPTED = 3830;
	exports.ER_TABLESPACE_TYPE_UNKNOWN = 3831;
	exports.ER_TARGET_TABLESPACE_UNENCRYPTED = 3832;
	exports.ER_CANNOT_USE_ENCRYPTION_CLAUSE = 3833;
	exports.ER_INVALID_MULTIPLE_CLAUSES = 3834;
	exports.ER_UNSUPPORTED_USE_OF_GRANT_AS = 3835;
	exports.ER_UKNOWN_AUTH_ID_OR_ACCESS_DENIED_FOR_GRANT_AS = 3836;
	exports.ER_DEPENDENT_BY_FUNCTIONAL_INDEX = 3837;
	exports.ER_PLUGIN_NOT_EARLY = 3838;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_START_SUBDIR_PATH = 3839;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_START_TIMEOUT = 3840;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_DIRS_INVALID = 3841;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_LABEL_NOT_FOUND = 3842;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_DIR_EMPTY = 3843;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_NO_SUCH_DIR = 3844;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_DIR_CLASH = 3845;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_DIR_PERMISSIONS = 3846;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_FILE_CREATE = 3847;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_ACTIVE = 3848;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_INACTIVE = 3849;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_FAILED = 3850;
	exports.ER_INNODB_REDO_LOG_ARCHIVE_SESSION = 3851;
	exports.ER_STD_REGEX_ERROR = 3852;
	exports.ER_INVALID_JSON_TYPE = 3853;
	exports.ER_CANNOT_CONVERT_STRING = 3854;
	exports.ER_DEPENDENT_BY_PARTITION_FUNC = 3855;
	exports.ER_WARN_DEPRECATED_FLOAT_AUTO_INCREMENT = 3856;
	exports.ER_RPL_CANT_STOP_REPLICA_WHILE_LOCKED_BACKUP = 3857;
	exports.ER_WARN_DEPRECATED_FLOAT_DIGITS = 3858;
	exports.ER_WARN_DEPRECATED_FLOAT_UNSIGNED = 3859;
	exports.ER_WARN_DEPRECATED_INTEGER_DISPLAY_WIDTH = 3860;
	exports.ER_WARN_DEPRECATED_ZEROFILL = 3861;
	exports.ER_CLONE_DONOR = 3862;
	exports.ER_CLONE_PROTOCOL = 3863;
	exports.ER_CLONE_DONOR_VERSION = 3864;
	exports.ER_CLONE_OS = 3865;
	exports.ER_CLONE_PLATFORM = 3866;
	exports.ER_CLONE_CHARSET = 3867;
	exports.ER_CLONE_CONFIG = 3868;
	exports.ER_CLONE_SYS_CONFIG = 3869;
	exports.ER_CLONE_PLUGIN_MATCH = 3870;
	exports.ER_CLONE_LOOPBACK = 3871;
	exports.ER_CLONE_ENCRYPTION = 3872;
	exports.ER_CLONE_DISK_SPACE = 3873;
	exports.ER_CLONE_IN_PROGRESS = 3874;
	exports.ER_CLONE_DISALLOWED = 3875;
	exports.ER_CANNOT_GRANT_ROLES_TO_ANONYMOUS_USER = 3876;
	exports.ER_SECONDARY_ENGINE_PLUGIN = 3877;
	exports.ER_SECOND_PASSWORD_CANNOT_BE_EMPTY = 3878;
	exports.ER_DB_ACCESS_DENIED = 3879;
	exports.ER_DA_AUTH_ID_WITH_SYSTEM_USER_PRIV_IN_MANDATORY_ROLES = 3880;
	exports.ER_DA_RPL_GTID_TABLE_CANNOT_OPEN = 3881;
	exports.ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT = 3882;
	exports.ER_DA_PLUGIN_INSTALL_ERROR = 3883;
	exports.ER_NO_SESSION_TEMP = 3884;
	exports.ER_DA_UNKNOWN_ERROR_NUMBER = 3885;
	exports.ER_COLUMN_CHANGE_SIZE = 3886;
	exports.ER_REGEXP_INVALID_CAPTURE_GROUP_NAME = 3887;
	exports.ER_DA_SSL_LIBRARY_ERROR = 3888;
	exports.ER_SECONDARY_ENGINE = 3889;
	exports.ER_SECONDARY_ENGINE_DDL = 3890;
	exports.ER_INCORRECT_CURRENT_PASSWORD = 3891;
	exports.ER_MISSING_CURRENT_PASSWORD = 3892;
	exports.ER_CURRENT_PASSWORD_NOT_REQUIRED = 3893;
	exports.ER_PASSWORD_CANNOT_BE_RETAINED_ON_PLUGIN_CHANGE = 3894;
	exports.ER_CURRENT_PASSWORD_CANNOT_BE_RETAINED = 3895;
	exports.ER_PARTIAL_REVOKES_EXIST = 3896;
	exports.ER_CANNOT_GRANT_SYSTEM_PRIV_TO_MANDATORY_ROLE = 3897;
	exports.ER_XA_REPLICATION_FILTERS = 3898;
	exports.ER_UNSUPPORTED_SQL_MODE = 3899;
	exports.ER_REGEXP_INVALID_FLAG = 3900;
	exports.ER_PARTIAL_REVOKE_AND_DB_GRANT_BOTH_EXISTS = 3901;
	exports.ER_UNIT_NOT_FOUND = 3902;
	exports.ER_INVALID_JSON_VALUE_FOR_FUNC_INDEX = 3903;
	exports.ER_JSON_VALUE_OUT_OF_RANGE_FOR_FUNC_INDEX = 3904;
	exports.ER_EXCEEDED_MV_KEYS_NUM = 3905;
	exports.ER_EXCEEDED_MV_KEYS_SPACE = 3906;
	exports.ER_FUNCTIONAL_INDEX_DATA_IS_TOO_LONG = 3907;
	exports.ER_WRONG_MVI_VALUE = 3908;
	exports.ER_WARN_FUNC_INDEX_NOT_APPLICABLE = 3909;
	exports.ER_GRP_RPL_UDF_ERROR = 3910;
	exports.ER_UPDATE_GTID_PURGED_WITH_GR = 3911;
	exports.ER_GROUPING_ON_TIMESTAMP_IN_DST = 3912;
	exports.ER_TABLE_NAME_CAUSES_TOO_LONG_PATH = 3913;
	exports.ER_AUDIT_LOG_INSUFFICIENT_PRIVILEGE = 3914;
	exports.ER_AUDIT_LOG_PASSWORD_HAS_BEEN_COPIED = 3915;
	exports.ER_DA_GRP_RPL_STARTED_AUTO_REJOIN = 3916;
	exports.ER_SYSVAR_CHANGE_DURING_QUERY = 3917;
	exports.ER_GLOBSTAT_CHANGE_DURING_QUERY = 3918;
	exports.ER_GRP_RPL_MESSAGE_SERVICE_INIT_FAILURE = 3919;
	exports.ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_CLIENT = 3920;
	exports.ER_CHANGE_SOURCE_WRONG_COMPRESSION_LEVEL_CLIENT = 3921;
	exports.ER_WRONG_COMPRESSION_ALGORITHM_CLIENT = 3922;
	exports.ER_WRONG_COMPRESSION_LEVEL_CLIENT = 3923;
	exports.ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_LIST_CLIENT = 3924;
	exports.ER_CLIENT_PRIVILEGE_CHECKS_USER_CANNOT_BE_ANONYMOUS = 3925;
	exports.ER_CLIENT_PRIVILEGE_CHECKS_USER_DOES_NOT_EXIST = 3926;
	exports.ER_CLIENT_PRIVILEGE_CHECKS_USER_CORRUPT = 3927;
	exports.ER_CLIENT_PRIVILEGE_CHECKS_USER_NEEDS_RPL_APPLIER_PRIV = 3928;
	exports.ER_WARN_DA_PRIVILEGE_NOT_REGISTERED = 3929;
	exports.ER_CLIENT_KEYRING_UDF_KEY_INVALID = 3930;
	exports.ER_CLIENT_KEYRING_UDF_KEY_TYPE_INVALID = 3931;
	exports.ER_CLIENT_KEYRING_UDF_KEY_TOO_LONG = 3932;
	exports.ER_CLIENT_KEYRING_UDF_KEY_TYPE_TOO_LONG = 3933;
	exports.ER_JSON_SCHEMA_VALIDATION_ERROR_WITH_DETAILED_REPORT = 3934;
	exports.ER_DA_UDF_INVALID_CHARSET_SPECIFIED = 3935;
	exports.ER_DA_UDF_INVALID_CHARSET = 3936;
	exports.ER_DA_UDF_INVALID_COLLATION = 3937;
	exports.ER_DA_UDF_INVALID_EXTENSION_ARGUMENT_TYPE = 3938;
	exports.ER_MULTIPLE_CONSTRAINTS_WITH_SAME_NAME = 3939;
	exports.ER_CONSTRAINT_NOT_FOUND = 3940;
	exports.ER_ALTER_CONSTRAINT_ENFORCEMENT_NOT_SUPPORTED = 3941;
	exports.ER_TABLE_VALUE_CONSTRUCTOR_MUST_HAVE_COLUMNS = 3942;
	exports.ER_TABLE_VALUE_CONSTRUCTOR_CANNOT_HAVE_DEFAULT = 3943;
	exports.ER_CLIENT_QUERY_FAILURE_INVALID_NON_ROW_FORMAT = 3944;
	exports.ER_REQUIRE_ROW_FORMAT_INVALID_VALUE = 3945;
	exports.ER_FAILED_TO_DETERMINE_IF_ROLE_IS_MANDATORY = 3946;
	exports.ER_FAILED_TO_FETCH_MANDATORY_ROLE_LIST = 3947;
	exports.ER_CLIENT_LOCAL_FILES_DISABLED = 3948;
	exports.ER_IMP_INCOMPATIBLE_CFG_VERSION = 3949;
	exports.ER_DA_OOM = 3950;
	exports.ER_DA_UDF_INVALID_ARGUMENT_TO_SET_CHARSET = 3951;
	exports.ER_DA_UDF_INVALID_RETURN_TYPE_TO_SET_CHARSET = 3952;
	exports.ER_MULTIPLE_INTO_CLAUSES = 3953;
	exports.ER_MISPLACED_INTO = 3954;
	exports.ER_USER_ACCESS_DENIED_FOR_USER_ACCOUNT_BLOCKED_BY_PASSWORD_LOCK = 3955;
	exports.ER_WARN_DEPRECATED_YEAR_UNSIGNED = 3956;
	exports.ER_CLONE_NETWORK_PACKET = 3957;
	exports.ER_SDI_OPERATION_FAILED_MISSING_RECORD = 3958;
	exports.ER_DEPENDENT_BY_CHECK_CONSTRAINT = 3959;
	exports.ER_GRP_OPERATION_NOT_ALLOWED_GR_MUST_STOP = 3960;
	exports.ER_WARN_DEPRECATED_JSON_TABLE_ON_ERROR_ON_EMPTY = 3961;
	exports.ER_WARN_DEPRECATED_INNER_INTO = 3962;
	exports.ER_WARN_DEPRECATED_VALUES_FUNCTION_ALWAYS_NULL = 3963;
	exports.ER_WARN_DEPRECATED_SQL_CALC_FOUND_ROWS = 3964;
	exports.ER_WARN_DEPRECATED_FOUND_ROWS = 3965;
	exports.ER_MISSING_JSON_VALUE = 3966;
	exports.ER_MULTIPLE_JSON_VALUES = 3967;
	exports.ER_HOSTNAME_TOO_LONG = 3968;
	exports.ER_WARN_CLIENT_DEPRECATED_PARTITION_PREFIX_KEY = 3969;
	exports.ER_GROUP_REPLICATION_USER_EMPTY_MSG = 3970;
	exports.ER_GROUP_REPLICATION_USER_MANDATORY_MSG = 3971;
	exports.ER_GROUP_REPLICATION_PASSWORD_LENGTH = 3972;
	exports.ER_SUBQUERY_TRANSFORM_REJECTED = 3973;
	exports.ER_DA_GRP_RPL_RECOVERY_ENDPOINT_FORMAT = 3974;
	exports.ER_DA_GRP_RPL_RECOVERY_ENDPOINT_INVALID = 3975;
	exports.ER_WRONG_VALUE_FOR_VAR_PLUS_ACTIONABLE_PART = 3976;
	exports.ER_STATEMENT_NOT_ALLOWED_AFTER_START_TRANSACTION = 3977;
	exports.ER_FOREIGN_KEY_WITH_ATOMIC_CREATE_SELECT = 3978;
	exports.ER_NOT_ALLOWED_WITH_START_TRANSACTION = 3979;
	exports.ER_INVALID_JSON_ATTRIBUTE = 3980;
	exports.ER_ENGINE_ATTRIBUTE_NOT_SUPPORTED = 3981;
	exports.ER_INVALID_USER_ATTRIBUTE_JSON = 3982;
	exports.ER_INNODB_REDO_DISABLED = 3983;
	exports.ER_INNODB_REDO_ARCHIVING_ENABLED = 3984;
	exports.ER_MDL_OUT_OF_RESOURCES = 3985;
	exports.ER_IMPLICIT_COMPARISON_FOR_JSON = 3986;
	exports.ER_FUNCTION_DOES_NOT_SUPPORT_CHARACTER_SET = 3987;
	exports.ER_IMPOSSIBLE_STRING_CONVERSION = 3988;
	exports.ER_SCHEMA_READ_ONLY = 3989;
	exports.ER_RPL_ASYNC_RECONNECT_GTID_MODE_OFF = 3990;
	exports.ER_RPL_ASYNC_RECONNECT_AUTO_POSITION_OFF = 3991;
	exports.ER_DISABLE_GTID_MODE_REQUIRES_ASYNC_RECONNECT_OFF = 3992;
	exports.ER_DISABLE_AUTO_POSITION_REQUIRES_ASYNC_RECONNECT_OFF = 3993;
	exports.ER_INVALID_PARAMETER_USE = 3994;
	exports.ER_CHARACTER_SET_MISMATCH = 3995;
	exports.ER_WARN_VAR_VALUE_CHANGE_NOT_SUPPORTED = 3996;
	exports.ER_INVALID_TIME_ZONE_INTERVAL = 3997;
	exports.ER_INVALID_CAST = 3998;
	exports.ER_HYPERGRAPH_NOT_SUPPORTED_YET = 3999;
	exports.ER_WARN_HYPERGRAPH_EXPERIMENTAL = 4000;
	exports.ER_DA_NO_ERROR_LOG_PARSER_CONFIGURED = 4001;
	exports.ER_DA_ERROR_LOG_TABLE_DISABLED = 4002;
	exports.ER_DA_ERROR_LOG_MULTIPLE_FILTERS = 4003;
	exports.ER_DA_CANT_OPEN_ERROR_LOG = 4004;
	exports.ER_USER_REFERENCED_AS_DEFINER = 4005;
	exports.ER_CANNOT_USER_REFERENCED_AS_DEFINER = 4006;
	exports.ER_REGEX_NUMBER_TOO_BIG = 4007;
	exports.ER_SPVAR_NONINTEGER_TYPE = 4008;
	exports.WARN_UNSUPPORTED_ACL_TABLES_READ = 4009;
	exports.ER_BINLOG_UNSAFE_ACL_TABLE_READ_IN_DML_DDL = 4010;
	exports.ER_STOP_REPLICA_MONITOR_IO_THREAD_TIMEOUT = 4011;
	exports.ER_STARTING_REPLICA_MONITOR_IO_THREAD = 4012;
	exports.ER_CANT_USE_ANONYMOUS_TO_GTID_WITH_GTID_MODE_NOT_ON = 4013;
	exports.ER_CANT_COMBINE_ANONYMOUS_TO_GTID_AND_AUTOPOSITION = 4014;
	exports.ER_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_REQUIRES_GTID_MODE_ON = 4015;
	exports.ER_SQL_REPLICA_SKIP_COUNTER_USED_WITH_GTID_MODE_ON = 4016;
	exports.ER_USING_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_AS_LOCAL_OR_UUID = 4017;
	exports.ER_CANT_SET_ANONYMOUS_TO_GTID_AND_WAIT_UNTIL_SQL_THD_AFTER_GTIDS = 4018;
	exports.ER_CANT_SET_SQL_AFTER_OR_BEFORE_GTIDS_WITH_ANONYMOUS_TO_GTID = 4019;
	exports.ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_GROUP_NAME = 4020;
	exports.ER_CANT_USE_SAME_UUID_AS_GROUP_NAME = 4021;
	exports.ER_GRP_RPL_RECOVERY_CHANNEL_STILL_RUNNING = 4022;
	exports.ER_INNODB_INVALID_AUTOEXTEND_SIZE_VALUE = 4023;
	exports.ER_INNODB_INCOMPATIBLE_WITH_TABLESPACE = 4024;
	exports.ER_INNODB_AUTOEXTEND_SIZE_OUT_OF_RANGE = 4025;
	exports.ER_CANNOT_USE_AUTOEXTEND_SIZE_CLAUSE = 4026;
	exports.ER_ROLE_GRANTED_TO_ITSELF = 4027;
	exports.ER_TABLE_MUST_HAVE_A_VISIBLE_COLUMN = 4028;
	exports.ER_INNODB_COMPRESSION_FAILURE = 4029;
	exports.ER_WARN_ASYNC_CONN_FAILOVER_NETWORK_NAMESPACE = 4030;
	exports.ER_CLIENT_INTERACTION_TIMEOUT = 4031;
	exports.ER_INVALID_CAST_TO_GEOMETRY = 4032;
	exports.ER_INVALID_CAST_POLYGON_RING_DIRECTION = 4033;
	exports.ER_GIS_DIFFERENT_SRIDS_AGGREGATION = 4034;
	exports.ER_RELOAD_KEYRING_FAILURE = 4035;
	exports.ER_SDI_GET_KEYS_INVALID_TABLESPACE = 4036;
	exports.ER_CHANGE_RPL_SRC_WRONG_COMPRESSION_ALGORITHM_SIZE = 4037;
	exports.ER_WARN_DEPRECATED_TLS_VERSION_FOR_CHANNEL_CLI = 4038;
	exports.ER_CANT_USE_SAME_UUID_AS_VIEW_CHANGE_UUID = 4039;
	exports.ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_VIEW_CHANGE_UUID = 4040;
	exports.ER_GRP_RPL_VIEW_CHANGE_UUID_FAIL_GET_VARIABLE = 4041;
	exports.ER_WARN_ADUIT_LOG_MAX_SIZE_AND_PRUNE_SECONDS = 4042;
	exports.ER_WARN_ADUIT_LOG_MAX_SIZE_CLOSE_TO_ROTATE_ON_SIZE = 4043;
	exports.ER_KERBEROS_CREATE_USER = 4044;
	exports.ER_INSTALL_PLUGIN_CONFLICT_CLIENT = 4045;
	exports.ER_DA_ERROR_LOG_COMPONENT_FLUSH_FAILED = 4046;
	exports.ER_WARN_SQL_AFTER_MTS_GAPS_GAP_NOT_CALCULATED = 4047;
	exports.ER_INVALID_ASSIGNMENT_TARGET = 4048;
	exports.ER_OPERATION_NOT_ALLOWED_ON_GR_SECONDARY = 4049;
	exports.ER_GRP_RPL_FAILOVER_CHANNEL_STATUS_PROPAGATION = 4050;
	exports.ER_WARN_AUDIT_LOG_FORMAT_UNIX_TIMESTAMP_ONLY_WHEN_JSON = 4051;
	exports.ER_INVALID_MFA_PLUGIN_SPECIFIED = 4052;
	exports.ER_IDENTIFIED_BY_UNSUPPORTED = 4053;
	exports.ER_INVALID_PLUGIN_FOR_REGISTRATION = 4054;
	exports.ER_PLUGIN_REQUIRES_REGISTRATION = 4055;
	exports.ER_MFA_METHOD_EXISTS = 4056;
	exports.ER_MFA_METHOD_NOT_EXISTS = 4057;
	exports.ER_AUTHENTICATION_POLICY_MISMATCH = 4058;
	exports.ER_PLUGIN_REGISTRATION_DONE = 4059;
	exports.ER_INVALID_USER_FOR_REGISTRATION = 4060;
	exports.ER_USER_REGISTRATION_FAILED = 4061;
	exports.ER_MFA_METHODS_INVALID_ORDER = 4062;
	exports.ER_MFA_METHODS_IDENTICAL = 4063;
	exports.ER_INVALID_MFA_OPERATIONS_FOR_PASSWORDLESS_USER = 4064;
	exports.ER_CHANGE_REPLICATION_SOURCE_NO_OPTIONS_FOR_GTID_ONLY = 4065;
	exports.ER_CHANGE_REP_SOURCE_CANT_DISABLE_REQ_ROW_FORMAT_WITH_GTID_ONLY = 4066;
	exports.ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POSITION_WITH_GTID_ONLY = 4067;
	exports.ER_CHANGE_REP_SOURCE_CANT_DISABLE_GTID_ONLY_WITHOUT_POSITIONS = 4068;
	exports.ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POS_WITHOUT_POSITIONS = 4069;
	exports.ER_CHANGE_REP_SOURCE_GR_CHANNEL_WITH_GTID_MODE_NOT_ON = 4070;
	exports.ER_CANT_USE_GTID_ONLY_WITH_GTID_MODE_NOT_ON = 4071;
	exports.ER_WARN_C_DISABLE_GTID_ONLY_WITH_SOURCE_AUTO_POS_INVALID_POS = 4072;
	exports.ER_DA_SSL_FIPS_MODE_ERROR = 4073;
	exports.ER_VALUE_OUT_OF_RANGE = 4074;
	exports.ER_FULLTEXT_WITH_ROLLUP = 4075;
	exports.ER_REGEXP_MISSING_RESOURCE = 4076;
	exports.ER_WARN_REGEXP_USING_DEFAULT = 4077;
	exports.ER_REGEXP_MISSING_FILE = 4078;
	exports.ER_WARN_DEPRECATED_COLLATION = 4079;
	exports.ER_CONCURRENT_PROCEDURE_USAGE = 4080;
	exports.ER_DA_GLOBAL_CONN_LIMIT = 4081;
	exports.ER_DA_CONN_LIMIT = 4082;
	exports.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE_INSTANT = 4083;
	exports.ER_WARN_SF_UDF_NAME_COLLISION = 4084;
	exports.ER_CANNOT_PURGE_BINLOG_WITH_BACKUP_LOCK = 4085;
	exports.ER_TOO_MANY_WINDOWS = 4086;
	exports.ER_MYSQLBACKUP_CLIENT_MSG = 4087;
	exports.ER_COMMENT_CONTAINS_INVALID_STRING = 4088;
	exports.ER_DEFINITION_CONTAINS_INVALID_STRING = 4089;
	exports.ER_CANT_EXECUTE_COMMAND_WITH_ASSIGNED_GTID_NEXT = 4090;
	exports.ER_XA_TEMP_TABLE = 4091;
	exports.ER_INNODB_MAX_ROW_VERSION = 4092;
	exports.ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_SIZE = 4093;
	exports.ER_OPERATION_NOT_ALLOWED_WHILE_PRIMARY_CHANGE_IS_RUNNING = 4094;
	exports.ER_WARN_DEPRECATED_DATETIME_DELIMITER = 4095;
	exports.ER_WARN_DEPRECATED_SUPERFLUOUS_DELIMITER = 4096;
	exports.ER_CANNOT_PERSIST_SENSITIVE_VARIABLES = 4097;
	exports.ER_WARN_CANNOT_SECURELY_PERSIST_SENSITIVE_VARIABLES = 4098;
	exports.ER_WARN_TRG_ALREADY_EXISTS = 4099;
	exports.ER_IF_NOT_EXISTS_UNSUPPORTED_TRG_EXISTS_ON_DIFFERENT_TABLE = 4100;
	exports.ER_IF_NOT_EXISTS_UNSUPPORTED_UDF_NATIVE_FCT_NAME_COLLISION = 4101;
	exports.ER_SET_PASSWORD_AUTH_PLUGIN_ERROR = 4102;
	exports.ER_REDUCED_DBLWR_FILE_CORRUPTED = 4103;
	exports.ER_REDUCED_DBLWR_PAGE_FOUND = 4104;
	exports.ER_SRS_INVALID_LATITUDE_OF_ORIGIN = 4105;
	exports.ER_SRS_INVALID_LONGITUDE_OF_ORIGIN = 4106;
	exports.ER_SRS_UNUSED_PROJ_PARAMETER_PRESENT = 4107;
	exports.ER_GIPK_COLUMN_EXISTS = 4108;
	exports.ER_GIPK_FAILED_AUTOINC_COLUMN_EXISTS = 4109;
	exports.ER_GIPK_COLUMN_ALTER_NOT_ALLOWED = 4110;
	exports.ER_DROP_PK_COLUMN_TO_DROP_GIPK = 4111;
	exports.ER_CREATE_SELECT_WITH_GIPK_DISALLOWED_IN_SBR = 4112;
	exports.ER_DA_EXPIRE_LOGS_DAYS_IGNORED = 4113;
	exports.ER_CTE_RECURSIVE_NOT_UNION = 4114;
	exports.ER_COMMAND_BACKEND_FAILED_TO_FETCH_SECURITY_CTX = 4115;
	exports.ER_COMMAND_SERVICE_BACKEND_FAILED = 4116;
	exports.ER_CLIENT_FILE_PRIVILEGE_FOR_REPLICATION_CHECKS = 4117;
	exports.ER_GROUP_REPLICATION_FORCE_MEMBERS_COMMAND_FAILURE = 4118;
	exports.ER_WARN_DEPRECATED_IDENT = 4119;
	exports.ER_INTERSECT_ALL_MAX_DUPLICATES_EXCEEDED = 4120;
	exports.ER_TP_QUERY_THRS_PER_GRP_EXCEEDS_TXN_THR_LIMIT = 4121;
	exports.ER_BAD_TIMESTAMP_FORMAT = 4122;
	exports.ER_SHAPE_PRIDICTION_UDF = 4123;
	exports.ER_SRS_INVALID_HEIGHT = 4124;
	exports.ER_SRS_INVALID_SCALING = 4125;
	exports.ER_SRS_INVALID_ZONE_WIDTH = 4126;
	exports.ER_SRS_INVALID_LATITUDE_POLAR_STERE_VAR_A = 4127;
	exports.ER_WARN_DEPRECATED_CLIENT_NO_SCHEMA_OPTION = 4128;
	exports.ER_TABLE_NOT_EMPTY = 4129;
	exports.ER_TABLE_NO_PRIMARY_KEY = 4130;
	exports.ER_TABLE_IN_SHARED_TABLESPACE = 4131;
	exports.ER_INDEX_OTHER_THAN_PK = 4132;
	exports.ER_LOAD_BULK_DATA_UNSORTED = 4133;
	exports.ER_BULK_EXECUTOR_ERROR = 4134;
	exports.ER_BULK_READER_LIBCURL_INIT_FAILED = 4135;
	exports.ER_BULK_READER_LIBCURL_ERROR = 4136;
	exports.ER_BULK_READER_SERVER_ERROR = 4137;
	exports.ER_BULK_READER_COMMUNICATION_ERROR = 4138;
	exports.ER_BULK_LOAD_DATA_FAILED = 4139;
	exports.ER_BULK_LOADER_COLUMN_TOO_BIG_FOR_LEFTOVER_BUFFER = 4140;
	exports.ER_BULK_LOADER_COMPONENT_ERROR = 4141;
	exports.ER_BULK_LOADER_FILE_CONTAINS_LESS_LINES_THAN_IGNORE_CLAUSE = 4142;
	exports.ER_BULK_PARSER_MISSING_ENCLOSED_BY = 4143;
	exports.ER_BULK_PARSER_ROW_BUFFER_MAX_TOTAL_COLS_EXCEEDED = 4144;
	exports.ER_BULK_PARSER_COPY_BUFFER_SIZE_EXCEEDED = 4145;
	exports.ER_BULK_PARSER_UNEXPECTED_END_OF_INPUT = 4146;
	exports.ER_BULK_PARSER_UNEXPECTED_ROW_TERMINATOR = 4147;
	exports.ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_ENDING_ENCLOSED_BY = 4148;
	exports.ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_NULL_ESCAPE = 4149;
	exports.ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_COLUMN_TERMINATOR = 4150;
	exports.ER_BULK_PARSER_INCOMPLETE_ESCAPE_SEQUENCE = 4151;
	exports.ER_LOAD_BULK_DATA_FAILED = 4152;
	exports.ER_LOAD_BULK_DATA_WRONG_VALUE_FOR_FIELD = 4153;
	exports.ER_LOAD_BULK_DATA_WARN_NULL_TO_NOTNULL = 4154;
	exports.ER_REQUIRE_TABLE_PRIMARY_KEY_CHECK_GENERATE_WITH_GR = 4155;
	exports.ER_CANT_CHANGE_SYS_VAR_IN_READ_ONLY_MODE = 4156;
	exports.ER_INNODB_INSTANT_ADD_DROP_NOT_SUPPORTED_MAX_SIZE = 4157;
	exports.ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_FIELDS = 4158;
	exports.ER_CANT_SET_PERSISTED = 4159;
	exports.ER_INSTALL_COMPONENT_SET_NULL_VALUE = 4160;
	exports.ER_INSTALL_COMPONENT_SET_UNUSED_VALUE = 4161;
	exports.ER_WARN_DEPRECATED_USER_DEFINED_COLLATIONS = 4162;

	// Lookup-by-number table
	exports[1] = 'EE_CANTCREATEFILE';
	exports[2] = 'EE_READ';
	exports[3] = 'EE_WRITE';
	exports[4] = 'EE_BADCLOSE';
	exports[5] = 'EE_OUTOFMEMORY';
	exports[6] = 'EE_DELETE';
	exports[7] = 'EE_LINK';
	exports[9] = 'EE_EOFERR';
	exports[10] = 'EE_CANTLOCK';
	exports[11] = 'EE_CANTUNLOCK';
	exports[12] = 'EE_DIR';
	exports[13] = 'EE_STAT';
	exports[14] = 'EE_CANT_CHSIZE';
	exports[15] = 'EE_CANT_OPEN_STREAM';
	exports[16] = 'EE_GETWD';
	exports[17] = 'EE_SETWD';
	exports[18] = 'EE_LINK_WARNING';
	exports[19] = 'EE_OPEN_WARNING';
	exports[20] = 'EE_DISK_FULL';
	exports[21] = 'EE_CANT_MKDIR';
	exports[22] = 'EE_UNKNOWN_CHARSET';
	exports[23] = 'EE_OUT_OF_FILERESOURCES';
	exports[24] = 'EE_CANT_READLINK';
	exports[25] = 'EE_CANT_SYMLINK';
	exports[26] = 'EE_REALPATH';
	exports[27] = 'EE_SYNC';
	exports[28] = 'EE_UNKNOWN_COLLATION';
	exports[29] = 'EE_FILENOTFOUND';
	exports[30] = 'EE_FILE_NOT_CLOSED';
	exports[31] = 'EE_CHANGE_OWNERSHIP';
	exports[32] = 'EE_CHANGE_PERMISSIONS';
	exports[33] = 'EE_CANT_SEEK';
	exports[34] = 'EE_CAPACITY_EXCEEDED';
	exports[35] = 'EE_DISK_FULL_WITH_RETRY_MSG';
	exports[36] = 'EE_FAILED_TO_CREATE_TIMER';
	exports[37] = 'EE_FAILED_TO_DELETE_TIMER';
	exports[38] = 'EE_FAILED_TO_CREATE_TIMER_QUEUE';
	exports[39] = 'EE_FAILED_TO_START_TIMER_NOTIFY_THREAD';
	exports[40] = 'EE_FAILED_TO_CREATE_TIMER_NOTIFY_THREAD_INTERRUPT_EVENT';
	exports[41] = 'EE_EXITING_TIMER_NOTIFY_THREAD';
	exports[42] = 'EE_WIN_LIBRARY_LOAD_FAILED';
	exports[43] = 'EE_WIN_RUN_TIME_ERROR_CHECK';
	exports[44] = 'EE_FAILED_TO_DETERMINE_LARGE_PAGE_SIZE';
	exports[45] = 'EE_FAILED_TO_KILL_ALL_THREADS';
	exports[46] = 'EE_FAILED_TO_CREATE_IO_COMPLETION_PORT';
	exports[47] = 'EE_FAILED_TO_OPEN_DEFAULTS_FILE';
	exports[48] = 'EE_FAILED_TO_HANDLE_DEFAULTS_FILE';
	exports[49] = 'EE_WRONG_DIRECTIVE_IN_CONFIG_FILE';
	exports[50] = 'EE_SKIPPING_DIRECTIVE_DUE_TO_MAX_INCLUDE_RECURSION';
	exports[51] = 'EE_INCORRECT_GRP_DEFINITION_IN_CONFIG_FILE';
	exports[52] = 'EE_OPTION_WITHOUT_GRP_IN_CONFIG_FILE';
	exports[53] = 'EE_CONFIG_FILE_PERMISSION_ERROR';
	exports[54] = 'EE_IGNORE_WORLD_WRITABLE_CONFIG_FILE';
	exports[55] = 'EE_USING_DISABLED_OPTION';
	exports[56] = 'EE_USING_DISABLED_SHORT_OPTION';
	exports[57] = 'EE_USING_PASSWORD_ON_CLI_IS_INSECURE';
	exports[58] = 'EE_UNKNOWN_SUFFIX_FOR_VARIABLE';
	exports[59] = 'EE_SSL_ERROR_FROM_FILE';
	exports[60] = 'EE_SSL_ERROR';
	exports[61] = 'EE_NET_SEND_ERROR_IN_BOOTSTRAP';
	exports[62] = 'EE_PACKETS_OUT_OF_ORDER';
	exports[63] = 'EE_UNKNOWN_PROTOCOL_OPTION';
	exports[64] = 'EE_FAILED_TO_LOCATE_SERVER_PUBLIC_KEY';
	exports[65] = 'EE_PUBLIC_KEY_NOT_IN_PEM_FORMAT';
	exports[66] = 'EE_DEBUG_INFO';
	exports[67] = 'EE_UNKNOWN_VARIABLE';
	exports[68] = 'EE_UNKNOWN_OPTION';
	exports[69] = 'EE_UNKNOWN_SHORT_OPTION';
	exports[70] = 'EE_OPTION_WITHOUT_ARGUMENT';
	exports[71] = 'EE_OPTION_REQUIRES_ARGUMENT';
	exports[72] = 'EE_SHORT_OPTION_REQUIRES_ARGUMENT';
	exports[73] = 'EE_OPTION_IGNORED_DUE_TO_INVALID_VALUE';
	exports[74] = 'EE_OPTION_WITH_EMPTY_VALUE';
	exports[75] = 'EE_FAILED_TO_ASSIGN_MAX_VALUE_TO_OPTION';
	exports[76] = 'EE_INCORRECT_BOOLEAN_VALUE_FOR_OPTION';
	exports[77] = 'EE_FAILED_TO_SET_OPTION_VALUE';
	exports[78] = 'EE_INCORRECT_INT_VALUE_FOR_OPTION';
	exports[79] = 'EE_INCORRECT_UINT_VALUE_FOR_OPTION';
	exports[80] = 'EE_ADJUSTED_SIGNED_VALUE_FOR_OPTION';
	exports[81] = 'EE_ADJUSTED_UNSIGNED_VALUE_FOR_OPTION';
	exports[82] = 'EE_ADJUSTED_ULONGLONG_VALUE_FOR_OPTION';
	exports[83] = 'EE_ADJUSTED_DOUBLE_VALUE_FOR_OPTION';
	exports[84] = 'EE_INVALID_DECIMAL_VALUE_FOR_OPTION';
	exports[85] = 'EE_COLLATION_PARSER_ERROR';
	exports[86] = 'EE_FAILED_TO_RESET_BEFORE_PRIMARY_IGNORABLE_CHAR';
	exports[87] = 'EE_FAILED_TO_RESET_BEFORE_TERTIARY_IGNORABLE_CHAR';
	exports[88] = 'EE_SHIFT_CHAR_OUT_OF_RANGE';
	exports[89] = 'EE_RESET_CHAR_OUT_OF_RANGE';
	exports[90] = 'EE_UNKNOWN_LDML_TAG';
	exports[91] = 'EE_FAILED_TO_RESET_BEFORE_SECONDARY_IGNORABLE_CHAR';
	exports[92] = 'EE_FAILED_PROCESSING_DIRECTIVE';
	exports[93] = 'EE_PTHREAD_KILL_FAILED';
	exports[120] = 'HA_ERR_KEY_NOT_FOUND';
	exports[121] = 'HA_ERR_FOUND_DUPP_KEY';
	exports[122] = 'HA_ERR_INTERNAL_ERROR';
	exports[123] = 'HA_ERR_RECORD_CHANGED';
	exports[124] = 'HA_ERR_WRONG_INDEX';
	exports[125] = 'HA_ERR_ROLLED_BACK';
	exports[126] = 'HA_ERR_CRASHED';
	exports[127] = 'HA_ERR_WRONG_IN_RECORD';
	exports[128] = 'HA_ERR_OUT_OF_MEM';
	exports[130] = 'HA_ERR_NOT_A_TABLE';
	exports[131] = 'HA_ERR_WRONG_COMMAND';
	exports[132] = 'HA_ERR_OLD_FILE';
	exports[133] = 'HA_ERR_NO_ACTIVE_RECORD';
	exports[134] = 'HA_ERR_RECORD_DELETED';
	exports[135] = 'HA_ERR_RECORD_FILE_FULL';
	exports[136] = 'HA_ERR_INDEX_FILE_FULL';
	exports[137] = 'HA_ERR_END_OF_FILE';
	exports[138] = 'HA_ERR_UNSUPPORTED';
	exports[139] = 'HA_ERR_TOO_BIG_ROW';
	exports[140] = 'HA_WRONG_CREATE_OPTION';
	exports[141] = 'HA_ERR_FOUND_DUPP_UNIQUE';
	exports[142] = 'HA_ERR_UNKNOWN_CHARSET';
	exports[143] = 'HA_ERR_WRONG_MRG_TABLE_DEF';
	exports[144] = 'HA_ERR_CRASHED_ON_REPAIR';
	exports[145] = 'HA_ERR_CRASHED_ON_USAGE';
	exports[146] = 'HA_ERR_LOCK_WAIT_TIMEOUT';
	exports[147] = 'HA_ERR_LOCK_TABLE_FULL';
	exports[148] = 'HA_ERR_READ_ONLY_TRANSACTION';
	exports[149] = 'HA_ERR_LOCK_DEADLOCK';
	exports[150] = 'HA_ERR_CANNOT_ADD_FOREIGN';
	exports[151] = 'HA_ERR_NO_REFERENCED_ROW';
	exports[152] = 'HA_ERR_ROW_IS_REFERENCED';
	exports[153] = 'HA_ERR_NO_SAVEPOINT';
	exports[154] = 'HA_ERR_NON_UNIQUE_BLOCK_SIZE';
	exports[155] = 'HA_ERR_NO_SUCH_TABLE';
	exports[156] = 'HA_ERR_TABLE_EXIST';
	exports[157] = 'HA_ERR_NO_CONNECTION';
	exports[158] = 'HA_ERR_NULL_IN_SPATIAL';
	exports[159] = 'HA_ERR_TABLE_DEF_CHANGED';
	exports[160] = 'HA_ERR_NO_PARTITION_FOUND';
	exports[161] = 'HA_ERR_RBR_LOGGING_FAILED';
	exports[162] = 'HA_ERR_DROP_INDEX_FK';
	exports[163] = 'HA_ERR_FOREIGN_DUPLICATE_KEY';
	exports[164] = 'HA_ERR_TABLE_NEEDS_UPGRADE';
	exports[165] = 'HA_ERR_TABLE_READONLY';
	exports[166] = 'HA_ERR_AUTOINC_READ_FAILED';
	exports[167] = 'HA_ERR_AUTOINC_ERANGE';
	exports[168] = 'HA_ERR_GENERIC';
	exports[169] = 'HA_ERR_RECORD_IS_THE_SAME';
	exports[170] = 'HA_ERR_LOGGING_IMPOSSIBLE';
	exports[171] = 'HA_ERR_CORRUPT_EVENT';
	exports[172] = 'HA_ERR_NEW_FILE';
	exports[173] = 'HA_ERR_ROWS_EVENT_APPLY';
	exports[174] = 'HA_ERR_INITIALIZATION';
	exports[175] = 'HA_ERR_FILE_TOO_SHORT';
	exports[176] = 'HA_ERR_WRONG_CRC';
	exports[177] = 'HA_ERR_TOO_MANY_CONCURRENT_TRXS';
	exports[178] = 'HA_ERR_NOT_IN_LOCK_PARTITIONS';
	exports[179] = 'HA_ERR_INDEX_COL_TOO_LONG';
	exports[180] = 'HA_ERR_INDEX_CORRUPT';
	exports[181] = 'HA_ERR_UNDO_REC_TOO_BIG';
	exports[182] = 'HA_FTS_INVALID_DOCID';
	exports[183] = 'HA_ERR_TABLE_IN_FK_CHECK';
	exports[184] = 'HA_ERR_TABLESPACE_EXISTS';
	exports[185] = 'HA_ERR_TOO_MANY_FIELDS';
	exports[186] = 'HA_ERR_ROW_IN_WRONG_PARTITION';
	exports[187] = 'HA_ERR_INNODB_READ_ONLY';
	exports[188] = 'HA_ERR_FTS_EXCEED_RESULT_CACHE_LIMIT';
	exports[189] = 'HA_ERR_TEMP_FILE_WRITE_FAILURE';
	exports[190] = 'HA_ERR_INNODB_FORCED_RECOVERY';
	exports[191] = 'HA_ERR_FTS_TOO_MANY_WORDS_IN_PHRASE';
	exports[192] = 'HA_ERR_FK_DEPTH_EXCEEDED';
	exports[193] = 'HA_MISSING_CREATE_OPTION';
	exports[194] = 'HA_ERR_SE_OUT_OF_MEMORY';
	exports[195] = 'HA_ERR_TABLE_CORRUPT';
	exports[196] = 'HA_ERR_QUERY_INTERRUPTED';
	exports[197] = 'HA_ERR_TABLESPACE_MISSING';
	exports[198] = 'HA_ERR_TABLESPACE_IS_NOT_EMPTY';
	exports[199] = 'HA_ERR_WRONG_FILE_NAME';
	exports[200] = 'HA_ERR_NOT_ALLOWED_COMMAND';
	exports[201] = 'HA_ERR_COMPUTE_FAILED';
	exports[202] = 'HA_ERR_ROW_FORMAT_CHANGED';
	exports[203] = 'HA_ERR_NO_WAIT_LOCK';
	exports[204] = 'HA_ERR_DISK_FULL_NOWAIT';
	exports[205] = 'HA_ERR_NO_SESSION_TEMP';
	exports[206] = 'HA_ERR_WRONG_TABLE_NAME';
	exports[207] = 'HA_ERR_TOO_LONG_PATH';
	exports[208] = 'HA_ERR_SAMPLING_INIT_FAILED';
	exports[209] = 'HA_ERR_FTS_TOO_MANY_NESTED_EXP';
	exports[1000] = 'ER_HASHCHK';
	exports[1001] = 'ER_NISAMCHK';
	exports[1002] = 'ER_NO';
	exports[1003] = 'ER_YES';
	exports[1004] = 'ER_CANT_CREATE_FILE';
	exports[1005] = 'ER_CANT_CREATE_TABLE';
	exports[1006] = 'ER_CANT_CREATE_DB';
	exports[1007] = 'ER_DB_CREATE_EXISTS';
	exports[1008] = 'ER_DB_DROP_EXISTS';
	exports[1009] = 'ER_DB_DROP_DELETE';
	exports[1010] = 'ER_DB_DROP_RMDIR';
	exports[1011] = 'ER_CANT_DELETE_FILE';
	exports[1012] = 'ER_CANT_FIND_SYSTEM_REC';
	exports[1013] = 'ER_CANT_GET_STAT';
	exports[1014] = 'ER_CANT_GET_WD';
	exports[1015] = 'ER_CANT_LOCK';
	exports[1016] = 'ER_CANT_OPEN_FILE';
	exports[1017] = 'ER_FILE_NOT_FOUND';
	exports[1018] = 'ER_CANT_READ_DIR';
	exports[1019] = 'ER_CANT_SET_WD';
	exports[1020] = 'ER_CHECKREAD';
	exports[1021] = 'ER_DISK_FULL';
	exports[1022] = 'ER_DUP_KEY';
	exports[1023] = 'ER_ERROR_ON_CLOSE';
	exports[1024] = 'ER_ERROR_ON_READ';
	exports[1025] = 'ER_ERROR_ON_RENAME';
	exports[1026] = 'ER_ERROR_ON_WRITE';
	exports[1027] = 'ER_FILE_USED';
	exports[1028] = 'ER_FILSORT_ABORT';
	exports[1029] = 'ER_FORM_NOT_FOUND';
	exports[1030] = 'ER_GET_ERRNO';
	exports[1031] = 'ER_ILLEGAL_HA';
	exports[1032] = 'ER_KEY_NOT_FOUND';
	exports[1033] = 'ER_NOT_FORM_FILE';
	exports[1034] = 'ER_NOT_KEYFILE';
	exports[1035] = 'ER_OLD_KEYFILE';
	exports[1036] = 'ER_OPEN_AS_READONLY';
	exports[1037] = 'ER_OUTOFMEMORY';
	exports[1038] = 'ER_OUT_OF_SORTMEMORY';
	exports[1039] = 'ER_UNEXPECTED_EOF';
	exports[1040] = 'ER_CON_COUNT_ERROR';
	exports[1041] = 'ER_OUT_OF_RESOURCES';
	exports[1042] = 'ER_BAD_HOST_ERROR';
	exports[1043] = 'ER_HANDSHAKE_ERROR';
	exports[1044] = 'ER_DBACCESS_DENIED_ERROR';
	exports[1045] = 'ER_ACCESS_DENIED_ERROR';
	exports[1046] = 'ER_NO_DB_ERROR';
	exports[1047] = 'ER_UNKNOWN_COM_ERROR';
	exports[1048] = 'ER_BAD_NULL_ERROR';
	exports[1049] = 'ER_BAD_DB_ERROR';
	exports[1050] = 'ER_TABLE_EXISTS_ERROR';
	exports[1051] = 'ER_BAD_TABLE_ERROR';
	exports[1052] = 'ER_NON_UNIQ_ERROR';
	exports[1053] = 'ER_SERVER_SHUTDOWN';
	exports[1054] = 'ER_BAD_FIELD_ERROR';
	exports[1055] = 'ER_WRONG_FIELD_WITH_GROUP';
	exports[1056] = 'ER_WRONG_GROUP_FIELD';
	exports[1057] = 'ER_WRONG_SUM_SELECT';
	exports[1058] = 'ER_WRONG_VALUE_COUNT';
	exports[1059] = 'ER_TOO_LONG_IDENT';
	exports[1060] = 'ER_DUP_FIELDNAME';
	exports[1061] = 'ER_DUP_KEYNAME';
	exports[1062] = 'ER_DUP_ENTRY';
	exports[1063] = 'ER_WRONG_FIELD_SPEC';
	exports[1064] = 'ER_PARSE_ERROR';
	exports[1065] = 'ER_EMPTY_QUERY';
	exports[1066] = 'ER_NONUNIQ_TABLE';
	exports[1067] = 'ER_INVALID_DEFAULT';
	exports[1068] = 'ER_MULTIPLE_PRI_KEY';
	exports[1069] = 'ER_TOO_MANY_KEYS';
	exports[1070] = 'ER_TOO_MANY_KEY_PARTS';
	exports[1071] = 'ER_TOO_LONG_KEY';
	exports[1072] = 'ER_KEY_COLUMN_DOES_NOT_EXITS';
	exports[1073] = 'ER_BLOB_USED_AS_KEY';
	exports[1074] = 'ER_TOO_BIG_FIELDLENGTH';
	exports[1075] = 'ER_WRONG_AUTO_KEY';
	exports[1076] = 'ER_READY';
	exports[1077] = 'ER_NORMAL_SHUTDOWN';
	exports[1078] = 'ER_GOT_SIGNAL';
	exports[1079] = 'ER_SHUTDOWN_COMPLETE';
	exports[1080] = 'ER_FORCING_CLOSE';
	exports[1081] = 'ER_IPSOCK_ERROR';
	exports[1082] = 'ER_NO_SUCH_INDEX';
	exports[1083] = 'ER_WRONG_FIELD_TERMINATORS';
	exports[1084] = 'ER_BLOBS_AND_NO_TERMINATED';
	exports[1085] = 'ER_TEXTFILE_NOT_READABLE';
	exports[1086] = 'ER_FILE_EXISTS_ERROR';
	exports[1087] = 'ER_LOAD_INFO';
	exports[1088] = 'ER_ALTER_INFO';
	exports[1089] = 'ER_WRONG_SUB_KEY';
	exports[1090] = 'ER_CANT_REMOVE_ALL_FIELDS';
	exports[1091] = 'ER_CANT_DROP_FIELD_OR_KEY';
	exports[1092] = 'ER_INSERT_INFO';
	exports[1093] = 'ER_UPDATE_TABLE_USED';
	exports[1094] = 'ER_NO_SUCH_THREAD';
	exports[1095] = 'ER_KILL_DENIED_ERROR';
	exports[1096] = 'ER_NO_TABLES_USED';
	exports[1097] = 'ER_TOO_BIG_SET';
	exports[1098] = 'ER_NO_UNIQUE_LOGFILE';
	exports[1099] = 'ER_TABLE_NOT_LOCKED_FOR_WRITE';
	exports[1100] = 'ER_TABLE_NOT_LOCKED';
	exports[1101] = 'ER_BLOB_CANT_HAVE_DEFAULT';
	exports[1102] = 'ER_WRONG_DB_NAME';
	exports[1103] = 'ER_WRONG_TABLE_NAME';
	exports[1104] = 'ER_TOO_BIG_SELECT';
	exports[1105] = 'ER_UNKNOWN_ERROR';
	exports[1106] = 'ER_UNKNOWN_PROCEDURE';
	exports[1107] = 'ER_WRONG_PARAMCOUNT_TO_PROCEDURE';
	exports[1108] = 'ER_WRONG_PARAMETERS_TO_PROCEDURE';
	exports[1109] = 'ER_UNKNOWN_TABLE';
	exports[1110] = 'ER_FIELD_SPECIFIED_TWICE';
	exports[1111] = 'ER_INVALID_GROUP_FUNC_USE';
	exports[1112] = 'ER_UNSUPPORTED_EXTENSION';
	exports[1113] = 'ER_TABLE_MUST_HAVE_COLUMNS';
	exports[1114] = 'ER_RECORD_FILE_FULL';
	exports[1115] = 'ER_UNKNOWN_CHARACTER_SET';
	exports[1116] = 'ER_TOO_MANY_TABLES';
	exports[1117] = 'ER_TOO_MANY_FIELDS';
	exports[1118] = 'ER_TOO_BIG_ROWSIZE';
	exports[1119] = 'ER_STACK_OVERRUN';
	exports[1120] = 'ER_WRONG_OUTER_JOIN';
	exports[1121] = 'ER_NULL_COLUMN_IN_INDEX';
	exports[1122] = 'ER_CANT_FIND_UDF';
	exports[1123] = 'ER_CANT_INITIALIZE_UDF';
	exports[1124] = 'ER_UDF_NO_PATHS';
	exports[1125] = 'ER_UDF_EXISTS';
	exports[1126] = 'ER_CANT_OPEN_LIBRARY';
	exports[1127] = 'ER_CANT_FIND_DL_ENTRY';
	exports[1128] = 'ER_FUNCTION_NOT_DEFINED';
	exports[1129] = 'ER_HOST_IS_BLOCKED';
	exports[1130] = 'ER_HOST_NOT_PRIVILEGED';
	exports[1131] = 'ER_PASSWORD_ANONYMOUS_USER';
	exports[1132] = 'ER_PASSWORD_NOT_ALLOWED';
	exports[1133] = 'ER_PASSWORD_NO_MATCH';
	exports[1134] = 'ER_UPDATE_INFO';
	exports[1135] = 'ER_CANT_CREATE_THREAD';
	exports[1136] = 'ER_WRONG_VALUE_COUNT_ON_ROW';
	exports[1137] = 'ER_CANT_REOPEN_TABLE';
	exports[1138] = 'ER_INVALID_USE_OF_NULL';
	exports[1139] = 'ER_REGEXP_ERROR';
	exports[1140] = 'ER_MIX_OF_GROUP_FUNC_AND_FIELDS';
	exports[1141] = 'ER_NONEXISTING_GRANT';
	exports[1142] = 'ER_TABLEACCESS_DENIED_ERROR';
	exports[1143] = 'ER_COLUMNACCESS_DENIED_ERROR';
	exports[1144] = 'ER_ILLEGAL_GRANT_FOR_TABLE';
	exports[1145] = 'ER_GRANT_WRONG_HOST_OR_USER';
	exports[1146] = 'ER_NO_SUCH_TABLE';
	exports[1147] = 'ER_NONEXISTING_TABLE_GRANT';
	exports[1148] = 'ER_NOT_ALLOWED_COMMAND';
	exports[1149] = 'ER_SYNTAX_ERROR';
	exports[1150] = 'ER_UNUSED1';
	exports[1151] = 'ER_UNUSED2';
	exports[1152] = 'ER_ABORTING_CONNECTION';
	exports[1153] = 'ER_NET_PACKET_TOO_LARGE';
	exports[1154] = 'ER_NET_READ_ERROR_FROM_PIPE';
	exports[1155] = 'ER_NET_FCNTL_ERROR';
	exports[1156] = 'ER_NET_PACKETS_OUT_OF_ORDER';
	exports[1157] = 'ER_NET_UNCOMPRESS_ERROR';
	exports[1158] = 'ER_NET_READ_ERROR';
	exports[1159] = 'ER_NET_READ_INTERRUPTED';
	exports[1160] = 'ER_NET_ERROR_ON_WRITE';
	exports[1161] = 'ER_NET_WRITE_INTERRUPTED';
	exports[1162] = 'ER_TOO_LONG_STRING';
	exports[1163] = 'ER_TABLE_CANT_HANDLE_BLOB';
	exports[1164] = 'ER_TABLE_CANT_HANDLE_AUTO_INCREMENT';
	exports[1165] = 'ER_UNUSED3';
	exports[1166] = 'ER_WRONG_COLUMN_NAME';
	exports[1167] = 'ER_WRONG_KEY_COLUMN';
	exports[1168] = 'ER_WRONG_MRG_TABLE';
	exports[1169] = 'ER_DUP_UNIQUE';
	exports[1170] = 'ER_BLOB_KEY_WITHOUT_LENGTH';
	exports[1171] = 'ER_PRIMARY_CANT_HAVE_NULL';
	exports[1172] = 'ER_TOO_MANY_ROWS';
	exports[1173] = 'ER_REQUIRES_PRIMARY_KEY';
	exports[1174] = 'ER_NO_RAID_COMPILED';
	exports[1175] = 'ER_UPDATE_WITHOUT_KEY_IN_SAFE_MODE';
	exports[1176] = 'ER_KEY_DOES_NOT_EXITS';
	exports[1177] = 'ER_CHECK_NO_SUCH_TABLE';
	exports[1178] = 'ER_CHECK_NOT_IMPLEMENTED';
	exports[1179] = 'ER_CANT_DO_THIS_DURING_AN_TRANSACTION';
	exports[1180] = 'ER_ERROR_DURING_COMMIT';
	exports[1181] = 'ER_ERROR_DURING_ROLLBACK';
	exports[1182] = 'ER_ERROR_DURING_FLUSH_LOGS';
	exports[1183] = 'ER_ERROR_DURING_CHECKPOINT';
	exports[1184] = 'ER_NEW_ABORTING_CONNECTION';
	exports[1185] = 'ER_DUMP_NOT_IMPLEMENTED';
	exports[1186] = 'ER_FLUSH_MASTER_BINLOG_CLOSED';
	exports[1187] = 'ER_INDEX_REBUILD';
	exports[1188] = 'ER_SOURCE';
	exports[1189] = 'ER_SOURCE_NET_READ';
	exports[1190] = 'ER_SOURCE_NET_WRITE';
	exports[1191] = 'ER_FT_MATCHING_KEY_NOT_FOUND';
	exports[1192] = 'ER_LOCK_OR_ACTIVE_TRANSACTION';
	exports[1193] = 'ER_UNKNOWN_SYSTEM_VARIABLE';
	exports[1194] = 'ER_CRASHED_ON_USAGE';
	exports[1195] = 'ER_CRASHED_ON_REPAIR';
	exports[1196] = 'ER_WARNING_NOT_COMPLETE_ROLLBACK';
	exports[1197] = 'ER_TRANS_CACHE_FULL';
	exports[1198] = 'ER_SLAVE_MUST_STOP';
	exports[1199] = 'ER_REPLICA_NOT_RUNNING';
	exports[1200] = 'ER_BAD_REPLICA';
	exports[1201] = 'ER_CONNECTION_METADATA';
	exports[1202] = 'ER_REPLICA_THREAD';
	exports[1203] = 'ER_TOO_MANY_USER_CONNECTIONS';
	exports[1204] = 'ER_SET_CONSTANTS_ONLY';
	exports[1205] = 'ER_LOCK_WAIT_TIMEOUT';
	exports[1206] = 'ER_LOCK_TABLE_FULL';
	exports[1207] = 'ER_READ_ONLY_TRANSACTION';
	exports[1208] = 'ER_DROP_DB_WITH_READ_LOCK';
	exports[1209] = 'ER_CREATE_DB_WITH_READ_LOCK';
	exports[1210] = 'ER_WRONG_ARGUMENTS';
	exports[1211] = 'ER_NO_PERMISSION_TO_CREATE_USER';
	exports[1212] = 'ER_UNION_TABLES_IN_DIFFERENT_DIR';
	exports[1213] = 'ER_LOCK_DEADLOCK';
	exports[1214] = 'ER_TABLE_CANT_HANDLE_FT';
	exports[1215] = 'ER_CANNOT_ADD_FOREIGN';
	exports[1216] = 'ER_NO_REFERENCED_ROW';
	exports[1217] = 'ER_ROW_IS_REFERENCED';
	exports[1218] = 'ER_CONNECT_TO_SOURCE';
	exports[1219] = 'ER_QUERY_ON_MASTER';
	exports[1220] = 'ER_ERROR_WHEN_EXECUTING_COMMAND';
	exports[1221] = 'ER_WRONG_USAGE';
	exports[1222] = 'ER_WRONG_NUMBER_OF_COLUMNS_IN_SELECT';
	exports[1223] = 'ER_CANT_UPDATE_WITH_READLOCK';
	exports[1224] = 'ER_MIXING_NOT_ALLOWED';
	exports[1225] = 'ER_DUP_ARGUMENT';
	exports[1226] = 'ER_USER_LIMIT_REACHED';
	exports[1227] = 'ER_SPECIFIC_ACCESS_DENIED_ERROR';
	exports[1228] = 'ER_LOCAL_VARIABLE';
	exports[1229] = 'ER_GLOBAL_VARIABLE';
	exports[1230] = 'ER_NO_DEFAULT';
	exports[1231] = 'ER_WRONG_VALUE_FOR_VAR';
	exports[1232] = 'ER_WRONG_TYPE_FOR_VAR';
	exports[1233] = 'ER_VAR_CANT_BE_READ';
	exports[1234] = 'ER_CANT_USE_OPTION_HERE';
	exports[1235] = 'ER_NOT_SUPPORTED_YET';
	exports[1236] = 'ER_SOURCE_FATAL_ERROR_READING_BINLOG';
	exports[1237] = 'ER_REPLICA_IGNORED_TABLE';
	exports[1238] = 'ER_INCORRECT_GLOBAL_LOCAL_VAR';
	exports[1239] = 'ER_WRONG_FK_DEF';
	exports[1240] = 'ER_KEY_REF_DO_NOT_MATCH_TABLE_REF';
	exports[1241] = 'ER_OPERAND_COLUMNS';
	exports[1242] = 'ER_SUBQUERY_NO_1_ROW';
	exports[1243] = 'ER_UNKNOWN_STMT_HANDLER';
	exports[1244] = 'ER_CORRUPT_HELP_DB';
	exports[1245] = 'ER_CYCLIC_REFERENCE';
	exports[1246] = 'ER_AUTO_CONVERT';
	exports[1247] = 'ER_ILLEGAL_REFERENCE';
	exports[1248] = 'ER_DERIVED_MUST_HAVE_ALIAS';
	exports[1249] = 'ER_SELECT_REDUCED';
	exports[1250] = 'ER_TABLENAME_NOT_ALLOWED_HERE';
	exports[1251] = 'ER_NOT_SUPPORTED_AUTH_MODE';
	exports[1252] = 'ER_SPATIAL_CANT_HAVE_NULL';
	exports[1253] = 'ER_COLLATION_CHARSET_MISMATCH';
	exports[1254] = 'ER_SLAVE_WAS_RUNNING';
	exports[1255] = 'ER_SLAVE_WAS_NOT_RUNNING';
	exports[1256] = 'ER_TOO_BIG_FOR_UNCOMPRESS';
	exports[1257] = 'ER_ZLIB_Z_MEM_ERROR';
	exports[1258] = 'ER_ZLIB_Z_BUF_ERROR';
	exports[1259] = 'ER_ZLIB_Z_DATA_ERROR';
	exports[1260] = 'ER_CUT_VALUE_GROUP_CONCAT';
	exports[1261] = 'ER_WARN_TOO_FEW_RECORDS';
	exports[1262] = 'ER_WARN_TOO_MANY_RECORDS';
	exports[1263] = 'ER_WARN_NULL_TO_NOTNULL';
	exports[1264] = 'ER_WARN_DATA_OUT_OF_RANGE';
	exports[1265] = 'WARN_DATA_TRUNCATED';
	exports[1266] = 'ER_WARN_USING_OTHER_HANDLER';
	exports[1267] = 'ER_CANT_AGGREGATE_2COLLATIONS';
	exports[1268] = 'ER_DROP_USER';
	exports[1269] = 'ER_REVOKE_GRANTS';
	exports[1270] = 'ER_CANT_AGGREGATE_3COLLATIONS';
	exports[1271] = 'ER_CANT_AGGREGATE_NCOLLATIONS';
	exports[1272] = 'ER_VARIABLE_IS_NOT_STRUCT';
	exports[1273] = 'ER_UNKNOWN_COLLATION';
	exports[1274] = 'ER_REPLICA_IGNORED_SSL_PARAMS';
	exports[1275] = 'ER_SERVER_IS_IN_SECURE_AUTH_MODE';
	exports[1276] = 'ER_WARN_FIELD_RESOLVED';
	exports[1277] = 'ER_BAD_REPLICA_UNTIL_COND';
	exports[1278] = 'ER_MISSING_SKIP_REPLICA';
	exports[1279] = 'ER_UNTIL_COND_IGNORED';
	exports[1280] = 'ER_WRONG_NAME_FOR_INDEX';
	exports[1281] = 'ER_WRONG_NAME_FOR_CATALOG';
	exports[1282] = 'ER_WARN_QC_RESIZE';
	exports[1283] = 'ER_BAD_FT_COLUMN';
	exports[1284] = 'ER_UNKNOWN_KEY_CACHE';
	exports[1285] = 'ER_WARN_HOSTNAME_WONT_WORK';
	exports[1286] = 'ER_UNKNOWN_STORAGE_ENGINE';
	exports[1287] = 'ER_WARN_DEPRECATED_SYNTAX';
	exports[1288] = 'ER_NON_UPDATABLE_TABLE';
	exports[1289] = 'ER_FEATURE_DISABLED';
	exports[1290] = 'ER_OPTION_PREVENTS_STATEMENT';
	exports[1291] = 'ER_DUPLICATED_VALUE_IN_TYPE';
	exports[1292] = 'ER_TRUNCATED_WRONG_VALUE';
	exports[1293] = 'ER_TOO_MUCH_AUTO_TIMESTAMP_COLS';
	exports[1294] = 'ER_INVALID_ON_UPDATE';
	exports[1295] = 'ER_UNSUPPORTED_PS';
	exports[1296] = 'ER_GET_ERRMSG';
	exports[1297] = 'ER_GET_TEMPORARY_ERRMSG';
	exports[1298] = 'ER_UNKNOWN_TIME_ZONE';
	exports[1299] = 'ER_WARN_INVALID_TIMESTAMP';
	exports[1300] = 'ER_INVALID_CHARACTER_STRING';
	exports[1301] = 'ER_WARN_ALLOWED_PACKET_OVERFLOWED';
	exports[1302] = 'ER_CONFLICTING_DECLARATIONS';
	exports[1303] = 'ER_SP_NO_RECURSIVE_CREATE';
	exports[1304] = 'ER_SP_ALREADY_EXISTS';
	exports[1305] = 'ER_SP_DOES_NOT_EXIST';
	exports[1306] = 'ER_SP_DROP_FAILED';
	exports[1307] = 'ER_SP_STORE_FAILED';
	exports[1308] = 'ER_SP_LILABEL_MISMATCH';
	exports[1309] = 'ER_SP_LABEL_REDEFINE';
	exports[1310] = 'ER_SP_LABEL_MISMATCH';
	exports[1311] = 'ER_SP_UNINIT_VAR';
	exports[1312] = 'ER_SP_BADSELECT';
	exports[1313] = 'ER_SP_BADRETURN';
	exports[1314] = 'ER_SP_BADSTATEMENT';
	exports[1315] = 'ER_UPDATE_LOG_DEPRECATED_IGNORED';
	exports[1316] = 'ER_UPDATE_LOG_DEPRECATED_TRANSLATED';
	exports[1317] = 'ER_QUERY_INTERRUPTED';
	exports[1318] = 'ER_SP_WRONG_NO_OF_ARGS';
	exports[1319] = 'ER_SP_COND_MISMATCH';
	exports[1320] = 'ER_SP_NORETURN';
	exports[1321] = 'ER_SP_NORETURNEND';
	exports[1322] = 'ER_SP_BAD_CURSOR_QUERY';
	exports[1323] = 'ER_SP_BAD_CURSOR_SELECT';
	exports[1324] = 'ER_SP_CURSOR_MISMATCH';
	exports[1325] = 'ER_SP_CURSOR_ALREADY_OPEN';
	exports[1326] = 'ER_SP_CURSOR_NOT_OPEN';
	exports[1327] = 'ER_SP_UNDECLARED_VAR';
	exports[1328] = 'ER_SP_WRONG_NO_OF_FETCH_ARGS';
	exports[1329] = 'ER_SP_FETCH_NO_DATA';
	exports[1330] = 'ER_SP_DUP_PARAM';
	exports[1331] = 'ER_SP_DUP_VAR';
	exports[1332] = 'ER_SP_DUP_COND';
	exports[1333] = 'ER_SP_DUP_CURS';
	exports[1334] = 'ER_SP_CANT_ALTER';
	exports[1335] = 'ER_SP_SUBSELECT_NYI';
	exports[1336] = 'ER_STMT_NOT_ALLOWED_IN_SF_OR_TRG';
	exports[1337] = 'ER_SP_VARCOND_AFTER_CURSHNDLR';
	exports[1338] = 'ER_SP_CURSOR_AFTER_HANDLER';
	exports[1339] = 'ER_SP_CASE_NOT_FOUND';
	exports[1340] = 'ER_FPARSER_TOO_BIG_FILE';
	exports[1341] = 'ER_FPARSER_BAD_HEADER';
	exports[1342] = 'ER_FPARSER_EOF_IN_COMMENT';
	exports[1343] = 'ER_FPARSER_ERROR_IN_PARAMETER';
	exports[1344] = 'ER_FPARSER_EOF_IN_UNKNOWN_PARAMETER';
	exports[1345] = 'ER_VIEW_NO_EXPLAIN';
	exports[1346] = 'ER_FRM_UNKNOWN_TYPE';
	exports[1347] = 'ER_WRONG_OBJECT';
	exports[1348] = 'ER_NONUPDATEABLE_COLUMN';
	exports[1349] = 'ER_VIEW_SELECT_DERIVED';
	exports[1350] = 'ER_VIEW_SELECT_CLAUSE';
	exports[1351] = 'ER_VIEW_SELECT_VARIABLE';
	exports[1352] = 'ER_VIEW_SELECT_TMPTABLE';
	exports[1353] = 'ER_VIEW_WRONG_LIST';
	exports[1354] = 'ER_WARN_VIEW_MERGE';
	exports[1355] = 'ER_WARN_VIEW_WITHOUT_KEY';
	exports[1356] = 'ER_VIEW_INVALID';
	exports[1357] = 'ER_SP_NO_DROP_SP';
	exports[1358] = 'ER_SP_GOTO_IN_HNDLR';
	exports[1359] = 'ER_TRG_ALREADY_EXISTS';
	exports[1360] = 'ER_TRG_DOES_NOT_EXIST';
	exports[1361] = 'ER_TRG_ON_VIEW_OR_TEMP_TABLE';
	exports[1362] = 'ER_TRG_CANT_CHANGE_ROW';
	exports[1363] = 'ER_TRG_NO_SUCH_ROW_IN_TRG';
	exports[1364] = 'ER_NO_DEFAULT_FOR_FIELD';
	exports[1365] = 'ER_DIVISION_BY_ZERO';
	exports[1366] = 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD';
	exports[1367] = 'ER_ILLEGAL_VALUE_FOR_TYPE';
	exports[1368] = 'ER_VIEW_NONUPD_CHECK';
	exports[1369] = 'ER_VIEW_CHECK_FAILED';
	exports[1370] = 'ER_PROCACCESS_DENIED_ERROR';
	exports[1371] = 'ER_RELAY_LOG_FAIL';
	exports[1372] = 'ER_PASSWD_LENGTH';
	exports[1373] = 'ER_UNKNOWN_TARGET_BINLOG';
	exports[1374] = 'ER_IO_ERR_LOG_INDEX_READ';
	exports[1375] = 'ER_BINLOG_PURGE_PROHIBITED';
	exports[1376] = 'ER_FSEEK_FAIL';
	exports[1377] = 'ER_BINLOG_PURGE_FATAL_ERR';
	exports[1378] = 'ER_LOG_IN_USE';
	exports[1379] = 'ER_LOG_PURGE_UNKNOWN_ERR';
	exports[1380] = 'ER_RELAY_LOG_INIT';
	exports[1381] = 'ER_NO_BINARY_LOGGING';
	exports[1382] = 'ER_RESERVED_SYNTAX';
	exports[1383] = 'ER_WSAS_FAILED';
	exports[1384] = 'ER_DIFF_GROUPS_PROC';
	exports[1385] = 'ER_NO_GROUP_FOR_PROC';
	exports[1386] = 'ER_ORDER_WITH_PROC';
	exports[1387] = 'ER_LOGGING_PROHIBIT_CHANGING_OF';
	exports[1388] = 'ER_NO_FILE_MAPPING';
	exports[1389] = 'ER_WRONG_MAGIC';
	exports[1390] = 'ER_PS_MANY_PARAM';
	exports[1391] = 'ER_KEY_PART_0';
	exports[1392] = 'ER_VIEW_CHECKSUM';
	exports[1393] = 'ER_VIEW_MULTIUPDATE';
	exports[1394] = 'ER_VIEW_NO_INSERT_FIELD_LIST';
	exports[1395] = 'ER_VIEW_DELETE_MERGE_VIEW';
	exports[1396] = 'ER_CANNOT_USER';
	exports[1397] = 'ER_XAER_NOTA';
	exports[1398] = 'ER_XAER_INVAL';
	exports[1399] = 'ER_XAER_RMFAIL';
	exports[1400] = 'ER_XAER_OUTSIDE';
	exports[1401] = 'ER_XAER_RMERR';
	exports[1402] = 'ER_XA_RBROLLBACK';
	exports[1403] = 'ER_NONEXISTING_PROC_GRANT';
	exports[1404] = 'ER_PROC_AUTO_GRANT_FAIL';
	exports[1405] = 'ER_PROC_AUTO_REVOKE_FAIL';
	exports[1406] = 'ER_DATA_TOO_LONG';
	exports[1407] = 'ER_SP_BAD_SQLSTATE';
	exports[1408] = 'ER_STARTUP';
	exports[1409] = 'ER_LOAD_FROM_FIXED_SIZE_ROWS_TO_VAR';
	exports[1410] = 'ER_CANT_CREATE_USER_WITH_GRANT';
	exports[1411] = 'ER_WRONG_VALUE_FOR_TYPE';
	exports[1412] = 'ER_TABLE_DEF_CHANGED';
	exports[1413] = 'ER_SP_DUP_HANDLER';
	exports[1414] = 'ER_SP_NOT_VAR_ARG';
	exports[1415] = 'ER_SP_NO_RETSET';
	exports[1416] = 'ER_CANT_CREATE_GEOMETRY_OBJECT';
	exports[1417] = 'ER_FAILED_ROUTINE_BREAK_BINLOG';
	exports[1418] = 'ER_BINLOG_UNSAFE_ROUTINE';
	exports[1419] = 'ER_BINLOG_CREATE_ROUTINE_NEED_SUPER';
	exports[1420] = 'ER_EXEC_STMT_WITH_OPEN_CURSOR';
	exports[1421] = 'ER_STMT_HAS_NO_OPEN_CURSOR';
	exports[1422] = 'ER_COMMIT_NOT_ALLOWED_IN_SF_OR_TRG';
	exports[1423] = 'ER_NO_DEFAULT_FOR_VIEW_FIELD';
	exports[1424] = 'ER_SP_NO_RECURSION';
	exports[1425] = 'ER_TOO_BIG_SCALE';
	exports[1426] = 'ER_TOO_BIG_PRECISION';
	exports[1427] = 'ER_M_BIGGER_THAN_D';
	exports[1428] = 'ER_WRONG_LOCK_OF_SYSTEM_TABLE';
	exports[1429] = 'ER_CONNECT_TO_FOREIGN_DATA_SOURCE';
	exports[1430] = 'ER_QUERY_ON_FOREIGN_DATA_SOURCE';
	exports[1431] = 'ER_FOREIGN_DATA_SOURCE_DOESNT_EXIST';
	exports[1432] = 'ER_FOREIGN_DATA_STRING_INVALID_CANT_CREATE';
	exports[1433] = 'ER_FOREIGN_DATA_STRING_INVALID';
	exports[1434] = 'ER_CANT_CREATE_FEDERATED_TABLE';
	exports[1435] = 'ER_TRG_IN_WRONG_SCHEMA';
	exports[1436] = 'ER_STACK_OVERRUN_NEED_MORE';
	exports[1437] = 'ER_TOO_LONG_BODY';
	exports[1438] = 'ER_WARN_CANT_DROP_DEFAULT_KEYCACHE';
	exports[1439] = 'ER_TOO_BIG_DISPLAYWIDTH';
	exports[1440] = 'ER_XAER_DUPID';
	exports[1441] = 'ER_DATETIME_FUNCTION_OVERFLOW';
	exports[1442] = 'ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG';
	exports[1443] = 'ER_VIEW_PREVENT_UPDATE';
	exports[1444] = 'ER_PS_NO_RECURSION';
	exports[1445] = 'ER_SP_CANT_SET_AUTOCOMMIT';
	exports[1446] = 'ER_MALFORMED_DEFINER';
	exports[1447] = 'ER_VIEW_FRM_NO_USER';
	exports[1448] = 'ER_VIEW_OTHER_USER';
	exports[1449] = 'ER_NO_SUCH_USER';
	exports[1450] = 'ER_FORBID_SCHEMA_CHANGE';
	exports[1451] = 'ER_ROW_IS_REFERENCED_2';
	exports[1452] = 'ER_NO_REFERENCED_ROW_2';
	exports[1453] = 'ER_SP_BAD_VAR_SHADOW';
	exports[1454] = 'ER_TRG_NO_DEFINER';
	exports[1455] = 'ER_OLD_FILE_FORMAT';
	exports[1456] = 'ER_SP_RECURSION_LIMIT';
	exports[1457] = 'ER_SP_PROC_TABLE_CORRUPT';
	exports[1458] = 'ER_SP_WRONG_NAME';
	exports[1459] = 'ER_TABLE_NEEDS_UPGRADE';
	exports[1460] = 'ER_SP_NO_AGGREGATE';
	exports[1461] = 'ER_MAX_PREPARED_STMT_COUNT_REACHED';
	exports[1462] = 'ER_VIEW_RECURSIVE';
	exports[1463] = 'ER_NON_GROUPING_FIELD_USED';
	exports[1464] = 'ER_TABLE_CANT_HANDLE_SPKEYS';
	exports[1465] = 'ER_NO_TRIGGERS_ON_SYSTEM_SCHEMA';
	exports[1466] = 'ER_REMOVED_SPACES';
	exports[1467] = 'ER_AUTOINC_READ_FAILED';
	exports[1468] = 'ER_USERNAME';
	exports[1469] = 'ER_HOSTNAME';
	exports[1470] = 'ER_WRONG_STRING_LENGTH';
	exports[1471] = 'ER_NON_INSERTABLE_TABLE';
	exports[1472] = 'ER_ADMIN_WRONG_MRG_TABLE';
	exports[1473] = 'ER_TOO_HIGH_LEVEL_OF_NESTING_FOR_SELECT';
	exports[1474] = 'ER_NAME_BECOMES_EMPTY';
	exports[1475] = 'ER_AMBIGUOUS_FIELD_TERM';
	exports[1476] = 'ER_FOREIGN_SERVER_EXISTS';
	exports[1477] = 'ER_FOREIGN_SERVER_DOESNT_EXIST';
	exports[1478] = 'ER_ILLEGAL_HA_CREATE_OPTION';
	exports[1479] = 'ER_PARTITION_REQUIRES_VALUES_ERROR';
	exports[1480] = 'ER_PARTITION_WRONG_VALUES_ERROR';
	exports[1481] = 'ER_PARTITION_MAXVALUE_ERROR';
	exports[1482] = 'ER_PARTITION_SUBPARTITION_ERROR';
	exports[1483] = 'ER_PARTITION_SUBPART_MIX_ERROR';
	exports[1484] = 'ER_PARTITION_WRONG_NO_PART_ERROR';
	exports[1485] = 'ER_PARTITION_WRONG_NO_SUBPART_ERROR';
	exports[1486] = 'ER_WRONG_EXPR_IN_PARTITION_FUNC_ERROR';
	exports[1487] = 'ER_NO_CONST_EXPR_IN_RANGE_OR_LIST_ERROR';
	exports[1488] = 'ER_FIELD_NOT_FOUND_PART_ERROR';
	exports[1489] = 'ER_LIST_OF_FIELDS_ONLY_IN_HASH_ERROR';
	exports[1490] = 'ER_INCONSISTENT_PARTITION_INFO_ERROR';
	exports[1491] = 'ER_PARTITION_FUNC_NOT_ALLOWED_ERROR';
	exports[1492] = 'ER_PARTITIONS_MUST_BE_DEFINED_ERROR';
	exports[1493] = 'ER_RANGE_NOT_INCREASING_ERROR';
	exports[1494] = 'ER_INCONSISTENT_TYPE_OF_FUNCTIONS_ERROR';
	exports[1495] = 'ER_MULTIPLE_DEF_CONST_IN_LIST_PART_ERROR';
	exports[1496] = 'ER_PARTITION_ENTRY_ERROR';
	exports[1497] = 'ER_MIX_HANDLER_ERROR';
	exports[1498] = 'ER_PARTITION_NOT_DEFINED_ERROR';
	exports[1499] = 'ER_TOO_MANY_PARTITIONS_ERROR';
	exports[1500] = 'ER_SUBPARTITION_ERROR';
	exports[1501] = 'ER_CANT_CREATE_HANDLER_FILE';
	exports[1502] = 'ER_BLOB_FIELD_IN_PART_FUNC_ERROR';
	exports[1503] = 'ER_UNIQUE_KEY_NEED_ALL_FIELDS_IN_PF';
	exports[1504] = 'ER_NO_PARTS_ERROR';
	exports[1505] = 'ER_PARTITION_MGMT_ON_NONPARTITIONED';
	exports[1506] = 'ER_FOREIGN_KEY_ON_PARTITIONED';
	exports[1507] = 'ER_DROP_PARTITION_NON_EXISTENT';
	exports[1508] = 'ER_DROP_LAST_PARTITION';
	exports[1509] = 'ER_COALESCE_ONLY_ON_HASH_PARTITION';
	exports[1510] = 'ER_REORG_HASH_ONLY_ON_SAME_NO';
	exports[1511] = 'ER_REORG_NO_PARAM_ERROR';
	exports[1512] = 'ER_ONLY_ON_RANGE_LIST_PARTITION';
	exports[1513] = 'ER_ADD_PARTITION_SUBPART_ERROR';
	exports[1514] = 'ER_ADD_PARTITION_NO_NEW_PARTITION';
	exports[1515] = 'ER_COALESCE_PARTITION_NO_PARTITION';
	exports[1516] = 'ER_REORG_PARTITION_NOT_EXIST';
	exports[1517] = 'ER_SAME_NAME_PARTITION';
	exports[1518] = 'ER_NO_BINLOG_ERROR';
	exports[1519] = 'ER_CONSECUTIVE_REORG_PARTITIONS';
	exports[1520] = 'ER_REORG_OUTSIDE_RANGE';
	exports[1521] = 'ER_PARTITION_FUNCTION_FAILURE';
	exports[1522] = 'ER_PART_STATE_ERROR';
	exports[1523] = 'ER_LIMITED_PART_RANGE';
	exports[1524] = 'ER_PLUGIN_IS_NOT_LOADED';
	exports[1525] = 'ER_WRONG_VALUE';
	exports[1526] = 'ER_NO_PARTITION_FOR_GIVEN_VALUE';
	exports[1527] = 'ER_FILEGROUP_OPTION_ONLY_ONCE';
	exports[1528] = 'ER_CREATE_FILEGROUP_FAILED';
	exports[1529] = 'ER_DROP_FILEGROUP_FAILED';
	exports[1530] = 'ER_TABLESPACE_AUTO_EXTEND_ERROR';
	exports[1531] = 'ER_WRONG_SIZE_NUMBER';
	exports[1532] = 'ER_SIZE_OVERFLOW_ERROR';
	exports[1533] = 'ER_ALTER_FILEGROUP_FAILED';
	exports[1534] = 'ER_BINLOG_ROW_LOGGING_FAILED';
	exports[1535] = 'ER_BINLOG_ROW_WRONG_TABLE_DEF';
	exports[1536] = 'ER_BINLOG_ROW_RBR_TO_SBR';
	exports[1537] = 'ER_EVENT_ALREADY_EXISTS';
	exports[1538] = 'ER_EVENT_STORE_FAILED';
	exports[1539] = 'ER_EVENT_DOES_NOT_EXIST';
	exports[1540] = 'ER_EVENT_CANT_ALTER';
	exports[1541] = 'ER_EVENT_DROP_FAILED';
	exports[1542] = 'ER_EVENT_INTERVAL_NOT_POSITIVE_OR_TOO_BIG';
	exports[1543] = 'ER_EVENT_ENDS_BEFORE_STARTS';
	exports[1544] = 'ER_EVENT_EXEC_TIME_IN_THE_PAST';
	exports[1545] = 'ER_EVENT_OPEN_TABLE_FAILED';
	exports[1546] = 'ER_EVENT_NEITHER_M_EXPR_NOR_M_AT';
	exports[1547] = 'ER_COL_COUNT_DOESNT_MATCH_CORRUPTED';
	exports[1548] = 'ER_CANNOT_LOAD_FROM_TABLE';
	exports[1549] = 'ER_EVENT_CANNOT_DELETE';
	exports[1550] = 'ER_EVENT_COMPILE_ERROR';
	exports[1551] = 'ER_EVENT_SAME_NAME';
	exports[1552] = 'ER_EVENT_DATA_TOO_LONG';
	exports[1553] = 'ER_DROP_INDEX_FK';
	exports[1554] = 'ER_WARN_DEPRECATED_SYNTAX_WITH_VER';
	exports[1555] = 'ER_CANT_WRITE_LOCK_LOG_TABLE';
	exports[1556] = 'ER_CANT_LOCK_LOG_TABLE';
	exports[1557] = 'ER_FOREIGN_DUPLICATE_KEY';
	exports[1558] = 'ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE';
	exports[1559] = 'ER_TEMP_TABLE_PREVENTS_SWITCH_OUT_OF_RBR';
	exports[1560] = 'ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_FORMAT';
	exports[1561] = 'ER_NDB_CANT_SWITCH_BINLOG_FORMAT';
	exports[1562] = 'ER_PARTITION_NO_TEMPORARY';
	exports[1563] = 'ER_PARTITION_CONST_DOMAIN_ERROR';
	exports[1564] = 'ER_PARTITION_FUNCTION_IS_NOT_ALLOWED';
	exports[1565] = 'ER_DDL_LOG_ERROR';
	exports[1566] = 'ER_NULL_IN_VALUES_LESS_THAN';
	exports[1567] = 'ER_WRONG_PARTITION_NAME';
	exports[1568] = 'ER_CANT_CHANGE_TX_CHARACTERISTICS';
	exports[1569] = 'ER_DUP_ENTRY_AUTOINCREMENT_CASE';
	exports[1570] = 'ER_EVENT_MODIFY_QUEUE_ERROR';
	exports[1571] = 'ER_EVENT_SET_VAR_ERROR';
	exports[1572] = 'ER_PARTITION_MERGE_ERROR';
	exports[1573] = 'ER_CANT_ACTIVATE_LOG';
	exports[1574] = 'ER_RBR_NOT_AVAILABLE';
	exports[1575] = 'ER_BASE64_DECODE_ERROR';
	exports[1576] = 'ER_EVENT_RECURSION_FORBIDDEN';
	exports[1577] = 'ER_EVENTS_DB_ERROR';
	exports[1578] = 'ER_ONLY_INTEGERS_ALLOWED';
	exports[1579] = 'ER_UNSUPORTED_LOG_ENGINE';
	exports[1580] = 'ER_BAD_LOG_STATEMENT';
	exports[1581] = 'ER_CANT_RENAME_LOG_TABLE';
	exports[1582] = 'ER_WRONG_PARAMCOUNT_TO_NATIVE_FCT';
	exports[1583] = 'ER_WRONG_PARAMETERS_TO_NATIVE_FCT';
	exports[1584] = 'ER_WRONG_PARAMETERS_TO_STORED_FCT';
	exports[1585] = 'ER_NATIVE_FCT_NAME_COLLISION';
	exports[1586] = 'ER_DUP_ENTRY_WITH_KEY_NAME';
	exports[1587] = 'ER_BINLOG_PURGE_EMFILE';
	exports[1588] = 'ER_EVENT_CANNOT_CREATE_IN_THE_PAST';
	exports[1589] = 'ER_EVENT_CANNOT_ALTER_IN_THE_PAST';
	exports[1590] = 'ER_SLAVE_INCIDENT';
	exports[1591] = 'ER_NO_PARTITION_FOR_GIVEN_VALUE_SILENT';
	exports[1592] = 'ER_BINLOG_UNSAFE_STATEMENT';
	exports[1593] = 'ER_BINLOG_FATAL_ERROR';
	exports[1594] = 'ER_SLAVE_RELAY_LOG_READ_FAILURE';
	exports[1595] = 'ER_SLAVE_RELAY_LOG_WRITE_FAILURE';
	exports[1596] = 'ER_SLAVE_CREATE_EVENT_FAILURE';
	exports[1597] = 'ER_SLAVE_MASTER_COM_FAILURE';
	exports[1598] = 'ER_BINLOG_LOGGING_IMPOSSIBLE';
	exports[1599] = 'ER_VIEW_NO_CREATION_CTX';
	exports[1600] = 'ER_VIEW_INVALID_CREATION_CTX';
	exports[1601] = 'ER_SR_INVALID_CREATION_CTX';
	exports[1602] = 'ER_TRG_CORRUPTED_FILE';
	exports[1603] = 'ER_TRG_NO_CREATION_CTX';
	exports[1604] = 'ER_TRG_INVALID_CREATION_CTX';
	exports[1605] = 'ER_EVENT_INVALID_CREATION_CTX';
	exports[1606] = 'ER_TRG_CANT_OPEN_TABLE';
	exports[1607] = 'ER_CANT_CREATE_SROUTINE';
	exports[1608] = 'ER_NEVER_USED';
	exports[1609] = 'ER_NO_FORMAT_DESCRIPTION_EVENT_BEFORE_BINLOG_STATEMENT';
	exports[1610] = 'ER_REPLICA_CORRUPT_EVENT';
	exports[1611] = 'ER_LOAD_DATA_INVALID_COLUMN';
	exports[1612] = 'ER_LOG_PURGE_NO_FILE';
	exports[1613] = 'ER_XA_RBTIMEOUT';
	exports[1614] = 'ER_XA_RBDEADLOCK';
	exports[1615] = 'ER_NEED_REPREPARE';
	exports[1616] = 'ER_DELAYED_NOT_SUPPORTED';
	exports[1617] = 'WARN_NO_CONNECTION_METADATA';
	exports[1618] = 'WARN_OPTION_IGNORED';
	exports[1619] = 'ER_PLUGIN_DELETE_BUILTIN';
	exports[1620] = 'WARN_PLUGIN_BUSY';
	exports[1621] = 'ER_VARIABLE_IS_READONLY';
	exports[1622] = 'ER_WARN_ENGINE_TRANSACTION_ROLLBACK';
	exports[1623] = 'ER_SLAVE_HEARTBEAT_FAILURE';
	exports[1624] = 'ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE';
	exports[1625] = 'ER_NDB_REPLICATION_SCHEMA_ERROR';
	exports[1626] = 'ER_CONFLICT_FN_PARSE_ERROR';
	exports[1627] = 'ER_EXCEPTIONS_WRITE_ERROR';
	exports[1628] = 'ER_TOO_LONG_TABLE_COMMENT';
	exports[1629] = 'ER_TOO_LONG_FIELD_COMMENT';
	exports[1630] = 'ER_FUNC_INEXISTENT_NAME_COLLISION';
	exports[1631] = 'ER_DATABASE_NAME';
	exports[1632] = 'ER_TABLE_NAME';
	exports[1633] = 'ER_PARTITION_NAME';
	exports[1634] = 'ER_SUBPARTITION_NAME';
	exports[1635] = 'ER_TEMPORARY_NAME';
	exports[1636] = 'ER_RENAMED_NAME';
	exports[1637] = 'ER_TOO_MANY_CONCURRENT_TRXS';
	exports[1638] = 'WARN_NON_ASCII_SEPARATOR_NOT_IMPLEMENTED';
	exports[1639] = 'ER_DEBUG_SYNC_TIMEOUT';
	exports[1640] = 'ER_DEBUG_SYNC_HIT_LIMIT';
	exports[1641] = 'ER_DUP_SIGNAL_SET';
	exports[1642] = 'ER_SIGNAL_WARN';
	exports[1643] = 'ER_SIGNAL_NOT_FOUND';
	exports[1644] = 'ER_SIGNAL_EXCEPTION';
	exports[1645] = 'ER_RESIGNAL_WITHOUT_ACTIVE_HANDLER';
	exports[1646] = 'ER_SIGNAL_BAD_CONDITION_TYPE';
	exports[1647] = 'WARN_COND_ITEM_TRUNCATED';
	exports[1648] = 'ER_COND_ITEM_TOO_LONG';
	exports[1649] = 'ER_UNKNOWN_LOCALE';
	exports[1650] = 'ER_REPLICA_IGNORE_SERVER_IDS';
	exports[1651] = 'ER_QUERY_CACHE_DISABLED';
	exports[1652] = 'ER_SAME_NAME_PARTITION_FIELD';
	exports[1653] = 'ER_PARTITION_COLUMN_LIST_ERROR';
	exports[1654] = 'ER_WRONG_TYPE_COLUMN_VALUE_ERROR';
	exports[1655] = 'ER_TOO_MANY_PARTITION_FUNC_FIELDS_ERROR';
	exports[1656] = 'ER_MAXVALUE_IN_VALUES_IN';
	exports[1657] = 'ER_TOO_MANY_VALUES_ERROR';
	exports[1658] = 'ER_ROW_SINGLE_PARTITION_FIELD_ERROR';
	exports[1659] = 'ER_FIELD_TYPE_NOT_ALLOWED_AS_PARTITION_FIELD';
	exports[1660] = 'ER_PARTITION_FIELDS_TOO_LONG';
	exports[1661] = 'ER_BINLOG_ROW_ENGINE_AND_STMT_ENGINE';
	exports[1662] = 'ER_BINLOG_ROW_MODE_AND_STMT_ENGINE';
	exports[1663] = 'ER_BINLOG_UNSAFE_AND_STMT_ENGINE';
	exports[1664] = 'ER_BINLOG_ROW_INJECTION_AND_STMT_ENGINE';
	exports[1665] = 'ER_BINLOG_STMT_MODE_AND_ROW_ENGINE';
	exports[1666] = 'ER_BINLOG_ROW_INJECTION_AND_STMT_MODE';
	exports[1667] = 'ER_BINLOG_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE';
	exports[1668] = 'ER_BINLOG_UNSAFE_LIMIT';
	exports[1669] = 'ER_UNUSED4';
	exports[1670] = 'ER_BINLOG_UNSAFE_SYSTEM_TABLE';
	exports[1671] = 'ER_BINLOG_UNSAFE_AUTOINC_COLUMNS';
	exports[1672] = 'ER_BINLOG_UNSAFE_UDF';
	exports[1673] = 'ER_BINLOG_UNSAFE_SYSTEM_VARIABLE';
	exports[1674] = 'ER_BINLOG_UNSAFE_SYSTEM_FUNCTION';
	exports[1675] = 'ER_BINLOG_UNSAFE_NONTRANS_AFTER_TRANS';
	exports[1676] = 'ER_MESSAGE_AND_STATEMENT';
	exports[1677] = 'ER_SLAVE_CONVERSION_FAILED';
	exports[1678] = 'ER_REPLICA_CANT_CREATE_CONVERSION';
	exports[1679] = 'ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_FORMAT';
	exports[1680] = 'ER_PATH_LENGTH';
	exports[1681] = 'ER_WARN_DEPRECATED_SYNTAX_NO_REPLACEMENT';
	exports[1682] = 'ER_WRONG_NATIVE_TABLE_STRUCTURE';
	exports[1683] = 'ER_WRONG_PERFSCHEMA_USAGE';
	exports[1684] = 'ER_WARN_I_S_SKIPPED_TABLE';
	exports[1685] = 'ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_DIRECT';
	exports[1686] = 'ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_DIRECT';
	exports[1687] = 'ER_SPATIAL_MUST_HAVE_GEOM_COL';
	exports[1688] = 'ER_TOO_LONG_INDEX_COMMENT';
	exports[1689] = 'ER_LOCK_ABORTED';
	exports[1690] = 'ER_DATA_OUT_OF_RANGE';
	exports[1691] = 'ER_WRONG_SPVAR_TYPE_IN_LIMIT';
	exports[1692] = 'ER_BINLOG_UNSAFE_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE';
	exports[1693] = 'ER_BINLOG_UNSAFE_MIXED_STATEMENT';
	exports[1694] = 'ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_SQL_LOG_BIN';
	exports[1695] = 'ER_STORED_FUNCTION_PREVENTS_SWITCH_SQL_LOG_BIN';
	exports[1696] = 'ER_FAILED_READ_FROM_PAR_FILE';
	exports[1697] = 'ER_VALUES_IS_NOT_INT_TYPE_ERROR';
	exports[1698] = 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR';
	exports[1699] = 'ER_SET_PASSWORD_AUTH_PLUGIN';
	exports[1700] = 'ER_GRANT_PLUGIN_USER_EXISTS';
	exports[1701] = 'ER_TRUNCATE_ILLEGAL_FK';
	exports[1702] = 'ER_PLUGIN_IS_PERMANENT';
	exports[1703] = 'ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MIN';
	exports[1704] = 'ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MAX';
	exports[1705] = 'ER_STMT_CACHE_FULL';
	exports[1706] = 'ER_MULTI_UPDATE_KEY_CONFLICT';
	exports[1707] = 'ER_TABLE_NEEDS_REBUILD';
	exports[1708] = 'WARN_OPTION_BELOW_LIMIT';
	exports[1709] = 'ER_INDEX_COLUMN_TOO_LONG';
	exports[1710] = 'ER_ERROR_IN_TRIGGER_BODY';
	exports[1711] = 'ER_ERROR_IN_UNKNOWN_TRIGGER_BODY';
	exports[1712] = 'ER_INDEX_CORRUPT';
	exports[1713] = 'ER_UNDO_RECORD_TOO_BIG';
	exports[1714] = 'ER_BINLOG_UNSAFE_INSERT_IGNORE_SELECT';
	exports[1715] = 'ER_BINLOG_UNSAFE_INSERT_SELECT_UPDATE';
	exports[1716] = 'ER_BINLOG_UNSAFE_REPLACE_SELECT';
	exports[1717] = 'ER_BINLOG_UNSAFE_CREATE_IGNORE_SELECT';
	exports[1718] = 'ER_BINLOG_UNSAFE_CREATE_REPLACE_SELECT';
	exports[1719] = 'ER_BINLOG_UNSAFE_UPDATE_IGNORE';
	exports[1720] = 'ER_PLUGIN_NO_UNINSTALL';
	exports[1721] = 'ER_PLUGIN_NO_INSTALL';
	exports[1722] = 'ER_BINLOG_UNSAFE_WRITE_AUTOINC_SELECT';
	exports[1723] = 'ER_BINLOG_UNSAFE_CREATE_SELECT_AUTOINC';
	exports[1724] = 'ER_BINLOG_UNSAFE_INSERT_TWO_KEYS';
	exports[1725] = 'ER_TABLE_IN_FK_CHECK';
	exports[1726] = 'ER_UNSUPPORTED_ENGINE';
	exports[1727] = 'ER_BINLOG_UNSAFE_AUTOINC_NOT_FIRST';
	exports[1728] = 'ER_CANNOT_LOAD_FROM_TABLE_V2';
	exports[1729] = 'ER_SOURCE_DELAY_VALUE_OUT_OF_RANGE';
	exports[1730] = 'ER_ONLY_FD_AND_RBR_EVENTS_ALLOWED_IN_BINLOG_STATEMENT';
	exports[1731] = 'ER_PARTITION_EXCHANGE_DIFFERENT_OPTION';
	exports[1732] = 'ER_PARTITION_EXCHANGE_PART_TABLE';
	exports[1733] = 'ER_PARTITION_EXCHANGE_TEMP_TABLE';
	exports[1734] = 'ER_PARTITION_INSTEAD_OF_SUBPARTITION';
	exports[1735] = 'ER_UNKNOWN_PARTITION';
	exports[1736] = 'ER_TABLES_DIFFERENT_METADATA';
	exports[1737] = 'ER_ROW_DOES_NOT_MATCH_PARTITION';
	exports[1738] = 'ER_BINLOG_CACHE_SIZE_GREATER_THAN_MAX';
	exports[1739] = 'ER_WARN_INDEX_NOT_APPLICABLE';
	exports[1740] = 'ER_PARTITION_EXCHANGE_FOREIGN_KEY';
	exports[1741] = 'ER_NO_SUCH_KEY_VALUE';
	exports[1742] = 'ER_RPL_INFO_DATA_TOO_LONG';
	exports[1743] = 'ER_NETWORK_READ_EVENT_CHECKSUM_FAILURE';
	exports[1744] = 'ER_BINLOG_READ_EVENT_CHECKSUM_FAILURE';
	exports[1745] = 'ER_BINLOG_STMT_CACHE_SIZE_GREATER_THAN_MAX';
	exports[1746] = 'ER_CANT_UPDATE_TABLE_IN_CREATE_TABLE_SELECT';
	exports[1747] = 'ER_PARTITION_CLAUSE_ON_NONPARTITIONED';
	exports[1748] = 'ER_ROW_DOES_NOT_MATCH_GIVEN_PARTITION_SET';
	exports[1749] = 'ER_NO_SUCH_PARTITION';
	exports[1750] = 'ER_CHANGE_RPL_INFO_REPOSITORY_FAILURE';
	exports[1751] = 'ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_CREATED_TEMP_TABLE';
	exports[1752] = 'ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_DROPPED_TEMP_TABLE';
	exports[1753] = 'ER_MTA_FEATURE_IS_NOT_SUPPORTED';
	exports[1754] = 'ER_MTA_UPDATED_DBS_GREATER_MAX';
	exports[1755] = 'ER_MTA_CANT_PARALLEL';
	exports[1756] = 'ER_MTA_INCONSISTENT_DATA';
	exports[1757] = 'ER_FULLTEXT_NOT_SUPPORTED_WITH_PARTITIONING';
	exports[1758] = 'ER_DA_INVALID_CONDITION_NUMBER';
	exports[1759] = 'ER_INSECURE_PLAIN_TEXT';
	exports[1760] = 'ER_INSECURE_CHANGE_SOURCE';
	exports[1761] = 'ER_FOREIGN_DUPLICATE_KEY_WITH_CHILD_INFO';
	exports[1762] = 'ER_FOREIGN_DUPLICATE_KEY_WITHOUT_CHILD_INFO';
	exports[1763] = 'ER_SQLTHREAD_WITH_SECURE_REPLICA';
	exports[1764] = 'ER_TABLE_HAS_NO_FT';
	exports[1765] = 'ER_VARIABLE_NOT_SETTABLE_IN_SF_OR_TRIGGER';
	exports[1766] = 'ER_VARIABLE_NOT_SETTABLE_IN_TRANSACTION';
	exports[1767] = 'ER_GTID_NEXT_IS_NOT_IN_GTID_NEXT_LIST';
	exports[1768] = 'ER_CANT_CHANGE_GTID_NEXT_IN_TRANSACTION';
	exports[1769] = 'ER_SET_STATEMENT_CANNOT_INVOKE_FUNCTION';
	exports[1770] = 'ER_GTID_NEXT_CANT_BE_AUTOMATIC_IF_GTID_NEXT_LIST_IS_NON_NULL';
	exports[1771] = 'ER_SKIPPING_LOGGED_TRANSACTION';
	exports[1772] = 'ER_MALFORMED_GTID_SET_SPECIFICATION';
	exports[1773] = 'ER_MALFORMED_GTID_SET_ENCODING';
	exports[1774] = 'ER_MALFORMED_GTID_SPECIFICATION';
	exports[1775] = 'ER_GNO_EXHAUSTED';
	exports[1776] = 'ER_BAD_REPLICA_AUTO_POSITION';
	exports[1777] = 'ER_AUTO_POSITION_REQUIRES_GTID_MODE_NOT_OFF';
	exports[1778] = 'ER_CANT_DO_IMPLICIT_COMMIT_IN_TRX_WHEN_GTID_NEXT_IS_SET';
	exports[1779] = 'ER_GTID_MODE_ON_REQUIRES_ENFORCE_GTID_CONSISTENCY_ON';
	exports[1780] = 'ER_GTID_MODE_REQUIRES_BINLOG';
	exports[1781] = 'ER_CANT_SET_GTID_NEXT_TO_GTID_WHEN_GTID_MODE_IS_OFF';
	exports[1782] = 'ER_CANT_SET_GTID_NEXT_TO_ANONYMOUS_WHEN_GTID_MODE_IS_ON';
	exports[1783] = 'ER_CANT_SET_GTID_NEXT_LIST_TO_NON_NULL_WHEN_GTID_MODE_IS_OFF';
	exports[1784] = 'ER_FOUND_GTID_EVENT_WHEN_GTID_MODE_IS_OFF';
	exports[1785] = 'ER_GTID_UNSAFE_NON_TRANSACTIONAL_TABLE';
	exports[1786] = 'ER_GTID_UNSAFE_CREATE_SELECT';
	exports[1787] = 'ER_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRANSACTION';
	exports[1788] = 'ER_GTID_MODE_CAN_ONLY_CHANGE_ONE_STEP_AT_A_TIME';
	exports[1789] = 'ER_SOURCE_HAS_PURGED_REQUIRED_GTIDS';
	exports[1790] = 'ER_CANT_SET_GTID_NEXT_WHEN_OWNING_GTID';
	exports[1791] = 'ER_UNKNOWN_EXPLAIN_FORMAT';
	exports[1792] = 'ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION';
	exports[1793] = 'ER_TOO_LONG_TABLE_PARTITION_COMMENT';
	exports[1794] = 'ER_REPLICA_CONFIGURATION';
	exports[1795] = 'ER_INNODB_FT_LIMIT';
	exports[1796] = 'ER_INNODB_NO_FT_TEMP_TABLE';
	exports[1797] = 'ER_INNODB_FT_WRONG_DOCID_COLUMN';
	exports[1798] = 'ER_INNODB_FT_WRONG_DOCID_INDEX';
	exports[1799] = 'ER_INNODB_ONLINE_LOG_TOO_BIG';
	exports[1800] = 'ER_UNKNOWN_ALTER_ALGORITHM';
	exports[1801] = 'ER_UNKNOWN_ALTER_LOCK';
	exports[1802] = 'ER_MTA_CHANGE_SOURCE_CANT_RUN_WITH_GAPS';
	exports[1803] = 'ER_MTA_RECOVERY_FAILURE';
	exports[1804] = 'ER_MTA_RESET_WORKERS';
	exports[1805] = 'ER_COL_COUNT_DOESNT_MATCH_CORRUPTED_V2';
	exports[1806] = 'ER_REPLICA_SILENT_RETRY_TRANSACTION';
	exports[1807] = 'ER_DISCARD_FK_CHECKS_RUNNING';
	exports[1808] = 'ER_TABLE_SCHEMA_MISMATCH';
	exports[1809] = 'ER_TABLE_IN_SYSTEM_TABLESPACE';
	exports[1810] = 'ER_IO_READ_ERROR';
	exports[1811] = 'ER_IO_WRITE_ERROR';
	exports[1812] = 'ER_TABLESPACE_MISSING';
	exports[1813] = 'ER_TABLESPACE_EXISTS';
	exports[1814] = 'ER_TABLESPACE_DISCARDED';
	exports[1815] = 'ER_INTERNAL_ERROR';
	exports[1816] = 'ER_INNODB_IMPORT_ERROR';
	exports[1817] = 'ER_INNODB_INDEX_CORRUPT';
	exports[1818] = 'ER_INVALID_YEAR_COLUMN_LENGTH';
	exports[1819] = 'ER_NOT_VALID_PASSWORD';
	exports[1820] = 'ER_MUST_CHANGE_PASSWORD';
	exports[1821] = 'ER_FK_NO_INDEX_CHILD';
	exports[1822] = 'ER_FK_NO_INDEX_PARENT';
	exports[1823] = 'ER_FK_FAIL_ADD_SYSTEM';
	exports[1824] = 'ER_FK_CANNOT_OPEN_PARENT';
	exports[1825] = 'ER_FK_INCORRECT_OPTION';
	exports[1826] = 'ER_FK_DUP_NAME';
	exports[1827] = 'ER_PASSWORD_FORMAT';
	exports[1828] = 'ER_FK_COLUMN_CANNOT_DROP';
	exports[1829] = 'ER_FK_COLUMN_CANNOT_DROP_CHILD';
	exports[1830] = 'ER_FK_COLUMN_NOT_NULL';
	exports[1831] = 'ER_DUP_INDEX';
	exports[1832] = 'ER_FK_COLUMN_CANNOT_CHANGE';
	exports[1833] = 'ER_FK_COLUMN_CANNOT_CHANGE_CHILD';
	exports[1834] = 'ER_UNUSED5';
	exports[1835] = 'ER_MALFORMED_PACKET';
	exports[1836] = 'ER_READ_ONLY_MODE';
	exports[1837] = 'ER_GTID_NEXT_TYPE_UNDEFINED_GTID';
	exports[1838] = 'ER_VARIABLE_NOT_SETTABLE_IN_SP';
	exports[1839] = 'ER_CANT_SET_GTID_PURGED_WHEN_GTID_MODE_IS_OFF';
	exports[1840] = 'ER_CANT_SET_GTID_PURGED_WHEN_GTID_EXECUTED_IS_NOT_EMPTY';
	exports[1841] = 'ER_CANT_SET_GTID_PURGED_WHEN_OWNED_GTIDS_IS_NOT_EMPTY';
	exports[1842] = 'ER_GTID_PURGED_WAS_CHANGED';
	exports[1843] = 'ER_GTID_EXECUTED_WAS_CHANGED';
	exports[1844] = 'ER_BINLOG_STMT_MODE_AND_NO_REPL_TABLES';
	exports[1845] = 'ER_ALTER_OPERATION_NOT_SUPPORTED';
	exports[1846] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON';
	exports[1847] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COPY';
	exports[1848] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_PARTITION';
	exports[1849] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_RENAME';
	exports[1850] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE';
	exports[1851] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_CHECK';
	exports[1852] = 'ER_UNUSED6';
	exports[1853] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOPK';
	exports[1854] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_AUTOINC';
	exports[1855] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_HIDDEN_FTS';
	exports[1856] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_CHANGE_FTS';
	exports[1857] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FTS';
	exports[1858] = 'ER_SQL_REPLICA_SKIP_COUNTER_NOT_SETTABLE_IN_GTID_MODE';
	exports[1859] = 'ER_DUP_UNKNOWN_IN_INDEX';
	exports[1860] = 'ER_IDENT_CAUSES_TOO_LONG_PATH';
	exports[1861] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOT_NULL';
	exports[1862] = 'ER_MUST_CHANGE_PASSWORD_LOGIN';
	exports[1863] = 'ER_ROW_IN_WRONG_PARTITION';
	exports[1864] = 'ER_MTA_EVENT_BIGGER_PENDING_JOBS_SIZE_MAX';
	exports[1865] = 'ER_INNODB_NO_FT_USES_PARSER';
	exports[1866] = 'ER_BINLOG_LOGICAL_CORRUPTION';
	exports[1867] = 'ER_WARN_PURGE_LOG_IN_USE';
	exports[1868] = 'ER_WARN_PURGE_LOG_IS_ACTIVE';
	exports[1869] = 'ER_AUTO_INCREMENT_CONFLICT';
	exports[1870] = 'WARN_ON_BLOCKHOLE_IN_RBR';
	exports[1871] = 'ER_REPLICA_CM_INIT_REPOSITORY';
	exports[1872] = 'ER_REPLICA_AM_INIT_REPOSITORY';
	exports[1873] = 'ER_ACCESS_DENIED_CHANGE_USER_ERROR';
	exports[1874] = 'ER_INNODB_READ_ONLY';
	exports[1875] = 'ER_STOP_REPLICA_SQL_THREAD_TIMEOUT';
	exports[1876] = 'ER_STOP_REPLICA_IO_THREAD_TIMEOUT';
	exports[1877] = 'ER_TABLE_CORRUPT';
	exports[1878] = 'ER_TEMP_FILE_WRITE_FAILURE';
	exports[1879] = 'ER_INNODB_FT_AUX_NOT_HEX_ID';
	exports[1880] = 'ER_OLD_TEMPORALS_UPGRADED';
	exports[1881] = 'ER_INNODB_FORCED_RECOVERY';
	exports[1882] = 'ER_AES_INVALID_IV';
	exports[1883] = 'ER_PLUGIN_CANNOT_BE_UNINSTALLED';
	exports[1884] = 'ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_ASSIGNED_GTID';
	exports[1885] = 'ER_REPLICA_HAS_MORE_GTIDS_THAN_SOURCE';
	exports[1886] = 'ER_MISSING_KEY';
	exports[1887] = 'WARN_NAMED_PIPE_ACCESS_EVERYONE';
	exports[3000] = 'ER_FILE_CORRUPT';
	exports[3001] = 'ER_ERROR_ON_SOURCE';
	exports[3002] = 'ER_INCONSISTENT_ERROR';
	exports[3003] = 'ER_STORAGE_ENGINE_NOT_LOADED';
	exports[3004] = 'ER_GET_STACKED_DA_WITHOUT_ACTIVE_HANDLER';
	exports[3005] = 'ER_WARN_LEGACY_SYNTAX_CONVERTED';
	exports[3006] = 'ER_BINLOG_UNSAFE_FULLTEXT_PLUGIN';
	exports[3007] = 'ER_CANNOT_DISCARD_TEMPORARY_TABLE';
	exports[3008] = 'ER_FK_DEPTH_EXCEEDED';
	exports[3009] = 'ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE_V2';
	exports[3010] = 'ER_WARN_TRIGGER_DOESNT_HAVE_CREATED';
	exports[3011] = 'ER_REFERENCED_TRG_DOES_NOT_EXIST';
	exports[3012] = 'ER_EXPLAIN_NOT_SUPPORTED';
	exports[3013] = 'ER_INVALID_FIELD_SIZE';
	exports[3014] = 'ER_MISSING_HA_CREATE_OPTION';
	exports[3015] = 'ER_ENGINE_OUT_OF_MEMORY';
	exports[3016] = 'ER_PASSWORD_EXPIRE_ANONYMOUS_USER';
	exports[3017] = 'ER_REPLICA_SQL_THREAD_MUST_STOP';
	exports[3018] = 'ER_NO_FT_MATERIALIZED_SUBQUERY';
	exports[3019] = 'ER_INNODB_UNDO_LOG_FULL';
	exports[3020] = 'ER_INVALID_ARGUMENT_FOR_LOGARITHM';
	exports[3021] = 'ER_REPLICA_CHANNEL_IO_THREAD_MUST_STOP';
	exports[3022] = 'ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO';
	exports[3023] = 'ER_WARN_ONLY_SOURCE_LOG_FILE_NO_POS';
	exports[3024] = 'ER_QUERY_TIMEOUT';
	exports[3025] = 'ER_NON_RO_SELECT_DISABLE_TIMER';
	exports[3026] = 'ER_DUP_LIST_ENTRY';
	exports[3027] = 'ER_SQL_MODE_NO_EFFECT';
	exports[3028] = 'ER_AGGREGATE_ORDER_FOR_UNION';
	exports[3029] = 'ER_AGGREGATE_ORDER_NON_AGG_QUERY';
	exports[3030] = 'ER_REPLICA_WORKER_STOPPED_PREVIOUS_THD_ERROR';
	exports[3031] = 'ER_DONT_SUPPORT_REPLICA_PRESERVE_COMMIT_ORDER';
	exports[3032] = 'ER_SERVER_OFFLINE_MODE';
	exports[3033] = 'ER_GIS_DIFFERENT_SRIDS';
	exports[3034] = 'ER_GIS_UNSUPPORTED_ARGUMENT';
	exports[3035] = 'ER_GIS_UNKNOWN_ERROR';
	exports[3036] = 'ER_GIS_UNKNOWN_EXCEPTION';
	exports[3037] = 'ER_GIS_INVALID_DATA';
	exports[3038] = 'ER_BOOST_GEOMETRY_EMPTY_INPUT_EXCEPTION';
	exports[3039] = 'ER_BOOST_GEOMETRY_CENTROID_EXCEPTION';
	exports[3040] = 'ER_BOOST_GEOMETRY_OVERLAY_INVALID_INPUT_EXCEPTION';
	exports[3041] = 'ER_BOOST_GEOMETRY_TURN_INFO_EXCEPTION';
	exports[3042] = 'ER_BOOST_GEOMETRY_SELF_INTERSECTION_POINT_EXCEPTION';
	exports[3043] = 'ER_BOOST_GEOMETRY_UNKNOWN_EXCEPTION';
	exports[3044] = 'ER_STD_BAD_ALLOC_ERROR';
	exports[3045] = 'ER_STD_DOMAIN_ERROR';
	exports[3046] = 'ER_STD_LENGTH_ERROR';
	exports[3047] = 'ER_STD_INVALID_ARGUMENT';
	exports[3048] = 'ER_STD_OUT_OF_RANGE_ERROR';
	exports[3049] = 'ER_STD_OVERFLOW_ERROR';
	exports[3050] = 'ER_STD_RANGE_ERROR';
	exports[3051] = 'ER_STD_UNDERFLOW_ERROR';
	exports[3052] = 'ER_STD_LOGIC_ERROR';
	exports[3053] = 'ER_STD_RUNTIME_ERROR';
	exports[3054] = 'ER_STD_UNKNOWN_EXCEPTION';
	exports[3055] = 'ER_GIS_DATA_WRONG_ENDIANESS';
	exports[3056] = 'ER_CHANGE_SOURCE_PASSWORD_LENGTH';
	exports[3057] = 'ER_USER_LOCK_WRONG_NAME';
	exports[3058] = 'ER_USER_LOCK_DEADLOCK';
	exports[3059] = 'ER_REPLACE_INACCESSIBLE_ROWS';
	exports[3060] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_GIS';
	exports[3061] = 'ER_ILLEGAL_USER_VAR';
	exports[3062] = 'ER_GTID_MODE_OFF';
	exports[3063] = 'ER_UNSUPPORTED_BY_REPLICATION_THREAD';
	exports[3064] = 'ER_INCORRECT_TYPE';
	exports[3065] = 'ER_FIELD_IN_ORDER_NOT_SELECT';
	exports[3066] = 'ER_AGGREGATE_IN_ORDER_NOT_SELECT';
	exports[3067] = 'ER_INVALID_RPL_WILD_TABLE_FILTER_PATTERN';
	exports[3068] = 'ER_NET_OK_PACKET_TOO_LARGE';
	exports[3069] = 'ER_INVALID_JSON_DATA';
	exports[3070] = 'ER_INVALID_GEOJSON_MISSING_MEMBER';
	exports[3071] = 'ER_INVALID_GEOJSON_WRONG_TYPE';
	exports[3072] = 'ER_INVALID_GEOJSON_UNSPECIFIED';
	exports[3073] = 'ER_DIMENSION_UNSUPPORTED';
	exports[3074] = 'ER_REPLICA_CHANNEL_DOES_NOT_EXIST';
	exports[3075] = 'ER_SLAVE_MULTIPLE_CHANNELS_HOST_PORT';
	exports[3076] = 'ER_REPLICA_CHANNEL_NAME_INVALID_OR_TOO_LONG';
	exports[3077] = 'ER_REPLICA_NEW_CHANNEL_WRONG_REPOSITORY';
	exports[3078] = 'ER_SLAVE_CHANNEL_DELETE';
	exports[3079] = 'ER_REPLICA_MULTIPLE_CHANNELS_CMD';
	exports[3080] = 'ER_REPLICA_MAX_CHANNELS_EXCEEDED';
	exports[3081] = 'ER_REPLICA_CHANNEL_MUST_STOP';
	exports[3082] = 'ER_REPLICA_CHANNEL_NOT_RUNNING';
	exports[3083] = 'ER_REPLICA_CHANNEL_WAS_RUNNING';
	exports[3084] = 'ER_REPLICA_CHANNEL_WAS_NOT_RUNNING';
	exports[3085] = 'ER_REPLICA_CHANNEL_SQL_THREAD_MUST_STOP';
	exports[3086] = 'ER_REPLICA_CHANNEL_SQL_SKIP_COUNTER';
	exports[3087] = 'ER_WRONG_FIELD_WITH_GROUP_V2';
	exports[3088] = 'ER_MIX_OF_GROUP_FUNC_AND_FIELDS_V2';
	exports[3089] = 'ER_WARN_DEPRECATED_SYSVAR_UPDATE';
	exports[3090] = 'ER_WARN_DEPRECATED_SQLMODE';
	exports[3091] = 'ER_CANNOT_LOG_PARTIAL_DROP_DATABASE_WITH_GTID';
	exports[3092] = 'ER_GROUP_REPLICATION_CONFIGURATION';
	exports[3093] = 'ER_GROUP_REPLICATION_RUNNING';
	exports[3094] = 'ER_GROUP_REPLICATION_APPLIER_INIT_ERROR';
	exports[3095] = 'ER_GROUP_REPLICATION_STOP_APPLIER_THREAD_TIMEOUT';
	exports[3096] = 'ER_GROUP_REPLICATION_COMMUNICATION_LAYER_SESSION_ERROR';
	exports[3097] = 'ER_GROUP_REPLICATION_COMMUNICATION_LAYER_JOIN_ERROR';
	exports[3098] = 'ER_BEFORE_DML_VALIDATION_ERROR';
	exports[3099] = 'ER_PREVENTS_VARIABLE_WITHOUT_RBR';
	exports[3100] = 'ER_RUN_HOOK_ERROR';
	exports[3101] = 'ER_TRANSACTION_ROLLBACK_DURING_COMMIT';
	exports[3102] = 'ER_GENERATED_COLUMN_FUNCTION_IS_NOT_ALLOWED';
	exports[3103] = 'ER_UNSUPPORTED_ALTER_INPLACE_ON_VIRTUAL_COLUMN';
	exports[3104] = 'ER_WRONG_FK_OPTION_FOR_GENERATED_COLUMN';
	exports[3105] = 'ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN';
	exports[3106] = 'ER_UNSUPPORTED_ACTION_ON_GENERATED_COLUMN';
	exports[3107] = 'ER_GENERATED_COLUMN_NON_PRIOR';
	exports[3108] = 'ER_DEPENDENT_BY_GENERATED_COLUMN';
	exports[3109] = 'ER_GENERATED_COLUMN_REF_AUTO_INC';
	exports[3110] = 'ER_FEATURE_NOT_AVAILABLE';
	exports[3111] = 'ER_CANT_SET_GTID_MODE';
	exports[3112] = 'ER_CANT_USE_AUTO_POSITION_WITH_GTID_MODE_OFF';
	exports[3113] = 'ER_CANT_REPLICATE_ANONYMOUS_WITH_AUTO_POSITION';
	exports[3114] = 'ER_CANT_REPLICATE_ANONYMOUS_WITH_GTID_MODE_ON';
	exports[3115] = 'ER_CANT_REPLICATE_GTID_WITH_GTID_MODE_OFF';
	exports[3116] =
	  'ER_CANT_ENFORCE_GTID_CONSISTENCY_WITH_ONGOING_GTID_VIOLATING_TX';
	exports[3117] =
	  'ER_ENFORCE_GTID_CONSISTENCY_WARN_WITH_ONGOING_GTID_VIOLATING_TX';
	exports[3118] = 'ER_ACCOUNT_HAS_BEEN_LOCKED';
	exports[3119] = 'ER_WRONG_TABLESPACE_NAME';
	exports[3120] = 'ER_TABLESPACE_IS_NOT_EMPTY';
	exports[3121] = 'ER_WRONG_FILE_NAME';
	exports[3122] = 'ER_BOOST_GEOMETRY_INCONSISTENT_TURNS_EXCEPTION';
	exports[3123] = 'ER_WARN_OPTIMIZER_HINT_SYNTAX_ERROR';
	exports[3124] = 'ER_WARN_BAD_MAX_EXECUTION_TIME';
	exports[3125] = 'ER_WARN_UNSUPPORTED_MAX_EXECUTION_TIME';
	exports[3126] = 'ER_WARN_CONFLICTING_HINT';
	exports[3127] = 'ER_WARN_UNKNOWN_QB_NAME';
	exports[3128] = 'ER_UNRESOLVED_HINT_NAME';
	exports[3129] = 'ER_WARN_ON_MODIFYING_GTID_EXECUTED_TABLE';
	exports[3130] = 'ER_PLUGGABLE_PROTOCOL_COMMAND_NOT_SUPPORTED';
	exports[3131] = 'ER_LOCKING_SERVICE_WRONG_NAME';
	exports[3132] = 'ER_LOCKING_SERVICE_DEADLOCK';
	exports[3133] = 'ER_LOCKING_SERVICE_TIMEOUT';
	exports[3134] = 'ER_GIS_MAX_POINTS_IN_GEOMETRY_OVERFLOWED';
	exports[3135] = 'ER_SQL_MODE_MERGED';
	exports[3136] = 'ER_VTOKEN_PLUGIN_TOKEN_MISMATCH';
	exports[3137] = 'ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND';
	exports[3138] = 'ER_CANT_SET_VARIABLE_WHEN_OWNING_GTID';
	exports[3139] = 'ER_REPLICA_CHANNEL_OPERATION_NOT_ALLOWED';
	exports[3140] = 'ER_INVALID_JSON_TEXT';
	exports[3141] = 'ER_INVALID_JSON_TEXT_IN_PARAM';
	exports[3142] = 'ER_INVALID_JSON_BINARY_DATA';
	exports[3143] = 'ER_INVALID_JSON_PATH';
	exports[3144] = 'ER_INVALID_JSON_CHARSET';
	exports[3145] = 'ER_INVALID_JSON_CHARSET_IN_FUNCTION';
	exports[3146] = 'ER_INVALID_TYPE_FOR_JSON';
	exports[3147] = 'ER_INVALID_CAST_TO_JSON';
	exports[3148] = 'ER_INVALID_JSON_PATH_CHARSET';
	exports[3149] = 'ER_INVALID_JSON_PATH_WILDCARD';
	exports[3150] = 'ER_JSON_VALUE_TOO_BIG';
	exports[3151] = 'ER_JSON_KEY_TOO_BIG';
	exports[3152] = 'ER_JSON_USED_AS_KEY';
	exports[3153] = 'ER_JSON_VACUOUS_PATH';
	exports[3154] = 'ER_JSON_BAD_ONE_OR_ALL_ARG';
	exports[3155] = 'ER_NUMERIC_JSON_VALUE_OUT_OF_RANGE';
	exports[3156] = 'ER_INVALID_JSON_VALUE_FOR_CAST';
	exports[3157] = 'ER_JSON_DOCUMENT_TOO_DEEP';
	exports[3158] = 'ER_JSON_DOCUMENT_NULL_KEY';
	exports[3159] = 'ER_SECURE_TRANSPORT_REQUIRED';
	exports[3160] = 'ER_NO_SECURE_TRANSPORTS_CONFIGURED';
	exports[3161] = 'ER_DISABLED_STORAGE_ENGINE';
	exports[3162] = 'ER_USER_DOES_NOT_EXIST';
	exports[3163] = 'ER_USER_ALREADY_EXISTS';
	exports[3164] = 'ER_AUDIT_API_ABORT';
	exports[3165] = 'ER_INVALID_JSON_PATH_ARRAY_CELL';
	exports[3166] = 'ER_BUFPOOL_RESIZE_INPROGRESS';
	exports[3167] = 'ER_FEATURE_DISABLED_SEE_DOC';
	exports[3168] = 'ER_SERVER_ISNT_AVAILABLE';
	exports[3169] = 'ER_SESSION_WAS_KILLED';
	exports[3170] = 'ER_CAPACITY_EXCEEDED';
	exports[3171] = 'ER_CAPACITY_EXCEEDED_IN_RANGE_OPTIMIZER';
	exports[3172] = 'ER_TABLE_NEEDS_UPG_PART';
	exports[3173] = 'ER_CANT_WAIT_FOR_EXECUTED_GTID_SET_WHILE_OWNING_A_GTID';
	exports[3174] = 'ER_CANNOT_ADD_FOREIGN_BASE_COL_VIRTUAL';
	exports[3175] = 'ER_CANNOT_CREATE_VIRTUAL_INDEX_CONSTRAINT';
	exports[3176] = 'ER_ERROR_ON_MODIFYING_GTID_EXECUTED_TABLE';
	exports[3177] = 'ER_LOCK_REFUSED_BY_ENGINE';
	exports[3178] = 'ER_UNSUPPORTED_ALTER_ONLINE_ON_VIRTUAL_COLUMN';
	exports[3179] = 'ER_MASTER_KEY_ROTATION_NOT_SUPPORTED_BY_SE';
	exports[3180] = 'ER_MASTER_KEY_ROTATION_ERROR_BY_SE';
	exports[3181] = 'ER_MASTER_KEY_ROTATION_BINLOG_FAILED';
	exports[3182] = 'ER_MASTER_KEY_ROTATION_SE_UNAVAILABLE';
	exports[3183] = 'ER_TABLESPACE_CANNOT_ENCRYPT';
	exports[3184] = 'ER_INVALID_ENCRYPTION_OPTION';
	exports[3185] = 'ER_CANNOT_FIND_KEY_IN_KEYRING';
	exports[3186] = 'ER_CAPACITY_EXCEEDED_IN_PARSER';
	exports[3187] = 'ER_UNSUPPORTED_ALTER_ENCRYPTION_INPLACE';
	exports[3188] = 'ER_KEYRING_UDF_KEYRING_SERVICE_ERROR';
	exports[3189] = 'ER_USER_COLUMN_OLD_LENGTH';
	exports[3190] = 'ER_CANT_RESET_SOURCE';
	exports[3191] = 'ER_GROUP_REPLICATION_MAX_GROUP_SIZE';
	exports[3192] = 'ER_CANNOT_ADD_FOREIGN_BASE_COL_STORED';
	exports[3193] = 'ER_TABLE_REFERENCED';
	exports[3194] = 'ER_PARTITION_ENGINE_DEPRECATED_FOR_TABLE';
	exports[3195] = 'ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID_ZERO';
	exports[3196] = 'ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID';
	exports[3197] = 'ER_XA_RETRY';
	exports[3198] = 'ER_KEYRING_AWS_UDF_AWS_KMS_ERROR';
	exports[3199] = 'ER_BINLOG_UNSAFE_XA';
	exports[3200] = 'ER_UDF_ERROR';
	exports[3201] = 'ER_KEYRING_MIGRATION_FAILURE';
	exports[3202] = 'ER_KEYRING_ACCESS_DENIED_ERROR';
	exports[3203] = 'ER_KEYRING_MIGRATION_STATUS';
	exports[3204] = 'ER_PLUGIN_FAILED_TO_OPEN_TABLES';
	exports[3205] = 'ER_PLUGIN_FAILED_TO_OPEN_TABLE';
	exports[3206] = 'ER_AUDIT_LOG_NO_KEYRING_PLUGIN_INSTALLED';
	exports[3207] = 'ER_AUDIT_LOG_ENCRYPTION_PASSWORD_HAS_NOT_BEEN_SET';
	exports[3208] = 'ER_AUDIT_LOG_COULD_NOT_CREATE_AES_KEY';
	exports[3209] = 'ER_AUDIT_LOG_ENCRYPTION_PASSWORD_CANNOT_BE_FETCHED';
	exports[3210] = 'ER_AUDIT_LOG_JSON_FILTERING_NOT_ENABLED';
	exports[3211] = 'ER_AUDIT_LOG_UDF_INSUFFICIENT_PRIVILEGE';
	exports[3212] = 'ER_AUDIT_LOG_SUPER_PRIVILEGE_REQUIRED';
	exports[3213] = 'ER_COULD_NOT_REINITIALIZE_AUDIT_LOG_FILTERS';
	exports[3214] = 'ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_TYPE';
	exports[3215] = 'ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_COUNT';
	exports[3216] = 'ER_AUDIT_LOG_HAS_NOT_BEEN_INSTALLED';
	exports[3217] = 'ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_TYPE';
	exports[3218] = 'ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_VALUE';
	exports[3219] = 'ER_AUDIT_LOG_JSON_FILTER_PARSING_ERROR';
	exports[3220] = 'ER_AUDIT_LOG_JSON_FILTER_NAME_CANNOT_BE_EMPTY';
	exports[3221] = 'ER_AUDIT_LOG_JSON_USER_NAME_CANNOT_BE_EMPTY';
	exports[3222] = 'ER_AUDIT_LOG_JSON_FILTER_DOES_NOT_EXISTS';
	exports[3223] = 'ER_AUDIT_LOG_USER_FIRST_CHARACTER_MUST_BE_ALPHANUMERIC';
	exports[3224] = 'ER_AUDIT_LOG_USER_NAME_INVALID_CHARACTER';
	exports[3225] = 'ER_AUDIT_LOG_HOST_NAME_INVALID_CHARACTER';
	exports[3226] = 'WARN_DEPRECATED_MAXDB_SQL_MODE_FOR_TIMESTAMP';
	exports[3227] = 'ER_XA_REPLICATION_FILTERS';
	exports[3228] = 'ER_CANT_OPEN_ERROR_LOG';
	exports[3229] = 'ER_GROUPING_ON_TIMESTAMP_IN_DST';
	exports[3230] = 'ER_CANT_START_SERVER_NAMED_PIPE';
	exports[3231] = 'ER_WRITE_SET_EXCEEDS_LIMIT';
	exports[3232] = 'ER_DEPRECATED_TLS_VERSION_SESSION_57';
	exports[3233] = 'ER_WARN_DEPRECATED_TLS_VERSION_57';
	exports[3234] = 'ER_WARN_WRONG_NATIVE_TABLE_STRUCTURE';
	exports[3235] = 'ER_AES_INVALID_KDF_NAME';
	exports[3236] = 'ER_AES_INVALID_KDF_ITERATIONS';
	exports[3237] = 'WARN_AES_KEY_SIZE';
	exports[3238] = 'ER_AES_INVALID_KDF_OPTION_SIZE';
	exports[3500] = 'ER_UNSUPPORT_COMPRESSED_TEMPORARY_TABLE';
	exports[3501] = 'ER_ACL_OPERATION_FAILED';
	exports[3502] = 'ER_UNSUPPORTED_INDEX_ALGORITHM';
	exports[3503] = 'ER_NO_SUCH_DB';
	exports[3504] = 'ER_TOO_BIG_ENUM';
	exports[3505] = 'ER_TOO_LONG_SET_ENUM_VALUE';
	exports[3506] = 'ER_INVALID_DD_OBJECT';
	exports[3507] = 'ER_UPDATING_DD_TABLE';
	exports[3508] = 'ER_INVALID_DD_OBJECT_ID';
	exports[3509] = 'ER_INVALID_DD_OBJECT_NAME';
	exports[3510] = 'ER_TABLESPACE_MISSING_WITH_NAME';
	exports[3511] = 'ER_TOO_LONG_ROUTINE_COMMENT';
	exports[3512] = 'ER_SP_LOAD_FAILED';
	exports[3513] = 'ER_INVALID_BITWISE_OPERANDS_SIZE';
	exports[3514] = 'ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE';
	exports[3515] = 'ER_WARN_UNSUPPORTED_HINT';
	exports[3516] = 'ER_UNEXPECTED_GEOMETRY_TYPE';
	exports[3517] = 'ER_SRS_PARSE_ERROR';
	exports[3518] = 'ER_SRS_PROJ_PARAMETER_MISSING';
	exports[3519] = 'ER_WARN_SRS_NOT_FOUND';
	exports[3520] = 'ER_SRS_NOT_CARTESIAN';
	exports[3521] = 'ER_SRS_NOT_CARTESIAN_UNDEFINED';
	exports[3522] = 'ER_PK_INDEX_CANT_BE_INVISIBLE';
	exports[3523] = 'ER_UNKNOWN_AUTHID';
	exports[3524] = 'ER_FAILED_ROLE_GRANT';
	exports[3525] = 'ER_OPEN_ROLE_TABLES';
	exports[3526] = 'ER_FAILED_DEFAULT_ROLES';
	exports[3527] = 'ER_COMPONENTS_NO_SCHEME';
	exports[3528] = 'ER_COMPONENTS_NO_SCHEME_SERVICE';
	exports[3529] = 'ER_COMPONENTS_CANT_LOAD';
	exports[3530] = 'ER_ROLE_NOT_GRANTED';
	exports[3531] = 'ER_FAILED_REVOKE_ROLE';
	exports[3532] = 'ER_RENAME_ROLE';
	exports[3533] = 'ER_COMPONENTS_CANT_ACQUIRE_SERVICE_IMPLEMENTATION';
	exports[3534] = 'ER_COMPONENTS_CANT_SATISFY_DEPENDENCY';
	exports[3535] = 'ER_COMPONENTS_LOAD_CANT_REGISTER_SERVICE_IMPLEMENTATION';
	exports[3536] = 'ER_COMPONENTS_LOAD_CANT_INITIALIZE';
	exports[3537] = 'ER_COMPONENTS_UNLOAD_NOT_LOADED';
	exports[3538] = 'ER_COMPONENTS_UNLOAD_CANT_DEINITIALIZE';
	exports[3539] = 'ER_COMPONENTS_CANT_RELEASE_SERVICE';
	exports[3540] = 'ER_COMPONENTS_UNLOAD_CANT_UNREGISTER_SERVICE';
	exports[3541] = 'ER_COMPONENTS_CANT_UNLOAD';
	exports[3542] = 'ER_WARN_UNLOAD_THE_NOT_PERSISTED';
	exports[3543] = 'ER_COMPONENT_TABLE_INCORRECT';
	exports[3544] = 'ER_COMPONENT_MANIPULATE_ROW_FAILED';
	exports[3545] = 'ER_COMPONENTS_UNLOAD_DUPLICATE_IN_GROUP';
	exports[3546] = 'ER_CANT_SET_GTID_PURGED_DUE_SETS_CONSTRAINTS';
	exports[3547] = 'ER_CANNOT_LOCK_USER_MANAGEMENT_CACHES';
	exports[3548] = 'ER_SRS_NOT_FOUND';
	exports[3549] = 'ER_VARIABLE_NOT_PERSISTED';
	exports[3550] = 'ER_IS_QUERY_INVALID_CLAUSE';
	exports[3551] = 'ER_UNABLE_TO_STORE_STATISTICS';
	exports[3552] = 'ER_NO_SYSTEM_SCHEMA_ACCESS';
	exports[3553] = 'ER_NO_SYSTEM_TABLESPACE_ACCESS';
	exports[3554] = 'ER_NO_SYSTEM_TABLE_ACCESS';
	exports[3555] = 'ER_NO_SYSTEM_TABLE_ACCESS_FOR_DICTIONARY_TABLE';
	exports[3556] = 'ER_NO_SYSTEM_TABLE_ACCESS_FOR_SYSTEM_TABLE';
	exports[3557] = 'ER_NO_SYSTEM_TABLE_ACCESS_FOR_TABLE';
	exports[3558] = 'ER_INVALID_OPTION_KEY';
	exports[3559] = 'ER_INVALID_OPTION_VALUE';
	exports[3560] = 'ER_INVALID_OPTION_KEY_VALUE_PAIR';
	exports[3561] = 'ER_INVALID_OPTION_START_CHARACTER';
	exports[3562] = 'ER_INVALID_OPTION_END_CHARACTER';
	exports[3563] = 'ER_INVALID_OPTION_CHARACTERS';
	exports[3564] = 'ER_DUPLICATE_OPTION_KEY';
	exports[3565] = 'ER_WARN_SRS_NOT_FOUND_AXIS_ORDER';
	exports[3566] = 'ER_NO_ACCESS_TO_NATIVE_FCT';
	exports[3567] = 'ER_RESET_SOURCE_TO_VALUE_OUT_OF_RANGE';
	exports[3568] = 'ER_UNRESOLVED_TABLE_LOCK';
	exports[3569] = 'ER_DUPLICATE_TABLE_LOCK';
	exports[3570] = 'ER_BINLOG_UNSAFE_SKIP_LOCKED';
	exports[3571] = 'ER_BINLOG_UNSAFE_NOWAIT';
	exports[3572] = 'ER_LOCK_NOWAIT';
	exports[3573] = 'ER_CTE_RECURSIVE_REQUIRES_UNION';
	exports[3574] = 'ER_CTE_RECURSIVE_REQUIRES_NONRECURSIVE_FIRST';
	exports[3575] = 'ER_CTE_RECURSIVE_FORBIDS_AGGREGATION';
	exports[3576] = 'ER_CTE_RECURSIVE_FORBIDDEN_JOIN_ORDER';
	exports[3577] = 'ER_CTE_RECURSIVE_REQUIRES_SINGLE_REFERENCE';
	exports[3578] = 'ER_SWITCH_TMP_ENGINE';
	exports[3579] = 'ER_WINDOW_NO_SUCH_WINDOW';
	exports[3580] = 'ER_WINDOW_CIRCULARITY_IN_WINDOW_GRAPH';
	exports[3581] = 'ER_WINDOW_NO_CHILD_PARTITIONING';
	exports[3582] = 'ER_WINDOW_NO_INHERIT_FRAME';
	exports[3583] = 'ER_WINDOW_NO_REDEFINE_ORDER_BY';
	exports[3584] = 'ER_WINDOW_FRAME_START_ILLEGAL';
	exports[3585] = 'ER_WINDOW_FRAME_END_ILLEGAL';
	exports[3586] = 'ER_WINDOW_FRAME_ILLEGAL';
	exports[3587] = 'ER_WINDOW_RANGE_FRAME_ORDER_TYPE';
	exports[3588] = 'ER_WINDOW_RANGE_FRAME_TEMPORAL_TYPE';
	exports[3589] = 'ER_WINDOW_RANGE_FRAME_NUMERIC_TYPE';
	exports[3590] = 'ER_WINDOW_RANGE_BOUND_NOT_CONSTANT';
	exports[3591] = 'ER_WINDOW_DUPLICATE_NAME';
	exports[3592] = 'ER_WINDOW_ILLEGAL_ORDER_BY';
	exports[3593] = 'ER_WINDOW_INVALID_WINDOW_FUNC_USE';
	exports[3594] = 'ER_WINDOW_INVALID_WINDOW_FUNC_ALIAS_USE';
	exports[3595] = 'ER_WINDOW_NESTED_WINDOW_FUNC_USE_IN_WINDOW_SPEC';
	exports[3596] = 'ER_WINDOW_ROWS_INTERVAL_USE';
	exports[3597] = 'ER_WINDOW_NO_GROUP_ORDER';
	exports[3598] = 'ER_WINDOW_EXPLAIN_JSON';
	exports[3599] = 'ER_WINDOW_FUNCTION_IGNORES_FRAME';
	exports[3600] = 'ER_WL9236_NOW';
	exports[3601] = 'ER_INVALID_NO_OF_ARGS';
	exports[3602] = 'ER_FIELD_IN_GROUPING_NOT_GROUP_BY';
	exports[3603] = 'ER_TOO_LONG_TABLESPACE_COMMENT';
	exports[3604] = 'ER_ENGINE_CANT_DROP_TABLE';
	exports[3605] = 'ER_ENGINE_CANT_DROP_MISSING_TABLE';
	exports[3606] = 'ER_TABLESPACE_DUP_FILENAME';
	exports[3607] = 'ER_DB_DROP_RMDIR2';
	exports[3608] = 'ER_IMP_NO_FILES_MATCHED';
	exports[3609] = 'ER_IMP_SCHEMA_DOES_NOT_EXIST';
	exports[3610] = 'ER_IMP_TABLE_ALREADY_EXISTS';
	exports[3611] = 'ER_IMP_INCOMPATIBLE_MYSQLD_VERSION';
	exports[3612] = 'ER_IMP_INCOMPATIBLE_DD_VERSION';
	exports[3613] = 'ER_IMP_INCOMPATIBLE_SDI_VERSION';
	exports[3614] = 'ER_WARN_INVALID_HINT';
	exports[3615] = 'ER_VAR_DOES_NOT_EXIST';
	exports[3616] = 'ER_LONGITUDE_OUT_OF_RANGE';
	exports[3617] = 'ER_LATITUDE_OUT_OF_RANGE';
	exports[3618] = 'ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS';
	exports[3619] = 'ER_ILLEGAL_PRIVILEGE_LEVEL';
	exports[3620] = 'ER_NO_SYSTEM_VIEW_ACCESS';
	exports[3621] = 'ER_COMPONENT_FILTER_FLABBERGASTED';
	exports[3622] = 'ER_PART_EXPR_TOO_LONG';
	exports[3623] = 'ER_UDF_DROP_DYNAMICALLY_REGISTERED';
	exports[3624] = 'ER_UNABLE_TO_STORE_COLUMN_STATISTICS';
	exports[3625] = 'ER_UNABLE_TO_UPDATE_COLUMN_STATISTICS';
	exports[3626] = 'ER_UNABLE_TO_DROP_COLUMN_STATISTICS';
	exports[3627] = 'ER_UNABLE_TO_BUILD_HISTOGRAM';
	exports[3628] = 'ER_MANDATORY_ROLE';
	exports[3629] = 'ER_MISSING_TABLESPACE_FILE';
	exports[3630] = 'ER_PERSIST_ONLY_ACCESS_DENIED_ERROR';
	exports[3631] = 'ER_CMD_NEED_SUPER';
	exports[3632] = 'ER_PATH_IN_DATADIR';
	exports[3633] = 'ER_CLONE_DDL_IN_PROGRESS';
	exports[3634] = 'ER_CLONE_TOO_MANY_CONCURRENT_CLONES';
	exports[3635] = 'ER_APPLIER_LOG_EVENT_VALIDATION_ERROR';
	exports[3636] = 'ER_CTE_MAX_RECURSION_DEPTH';
	exports[3637] = 'ER_NOT_HINT_UPDATABLE_VARIABLE';
	exports[3638] = 'ER_CREDENTIALS_CONTRADICT_TO_HISTORY';
	exports[3639] = 'ER_WARNING_PASSWORD_HISTORY_CLAUSES_VOID';
	exports[3640] = 'ER_CLIENT_DOES_NOT_SUPPORT';
	exports[3641] = 'ER_I_S_SKIPPED_TABLESPACE';
	exports[3642] = 'ER_TABLESPACE_ENGINE_MISMATCH';
	exports[3643] = 'ER_WRONG_SRID_FOR_COLUMN';
	exports[3644] = 'ER_CANNOT_ALTER_SRID_DUE_TO_INDEX';
	exports[3645] = 'ER_WARN_BINLOG_PARTIAL_UPDATES_DISABLED';
	exports[3646] = 'ER_WARN_BINLOG_V1_ROW_EVENTS_DISABLED';
	exports[3647] = 'ER_WARN_BINLOG_PARTIAL_UPDATES_SUGGESTS_PARTIAL_IMAGES';
	exports[3648] = 'ER_COULD_NOT_APPLY_JSON_DIFF';
	exports[3649] = 'ER_CORRUPTED_JSON_DIFF';
	exports[3650] = 'ER_RESOURCE_GROUP_EXISTS';
	exports[3651] = 'ER_RESOURCE_GROUP_NOT_EXISTS';
	exports[3652] = 'ER_INVALID_VCPU_ID';
	exports[3653] = 'ER_INVALID_VCPU_RANGE';
	exports[3654] = 'ER_INVALID_THREAD_PRIORITY';
	exports[3655] = 'ER_DISALLOWED_OPERATION';
	exports[3656] = 'ER_RESOURCE_GROUP_BUSY';
	exports[3657] = 'ER_RESOURCE_GROUP_DISABLED';
	exports[3658] = 'ER_FEATURE_UNSUPPORTED';
	exports[3659] = 'ER_ATTRIBUTE_IGNORED';
	exports[3660] = 'ER_INVALID_THREAD_ID';
	exports[3661] = 'ER_RESOURCE_GROUP_BIND_FAILED';
	exports[3662] = 'ER_INVALID_USE_OF_FORCE_OPTION';
	exports[3663] = 'ER_GROUP_REPLICATION_COMMAND_FAILURE';
	exports[3664] = 'ER_SDI_OPERATION_FAILED';
	exports[3665] = 'ER_MISSING_JSON_TABLE_VALUE';
	exports[3666] = 'ER_WRONG_JSON_TABLE_VALUE';
	exports[3667] = 'ER_TF_MUST_HAVE_ALIAS';
	exports[3668] = 'ER_TF_FORBIDDEN_JOIN_TYPE';
	exports[3669] = 'ER_JT_VALUE_OUT_OF_RANGE';
	exports[3670] = 'ER_JT_MAX_NESTED_PATH';
	exports[3671] = 'ER_PASSWORD_EXPIRATION_NOT_SUPPORTED_BY_AUTH_METHOD';
	exports[3672] = 'ER_INVALID_GEOJSON_CRS_NOT_TOP_LEVEL';
	exports[3673] = 'ER_BAD_NULL_ERROR_NOT_IGNORED';
	exports[3674] = 'WARN_USELESS_SPATIAL_INDEX';
	exports[3675] = 'ER_DISK_FULL_NOWAIT';
	exports[3676] = 'ER_PARSE_ERROR_IN_DIGEST_FN';
	exports[3677] = 'ER_UNDISCLOSED_PARSE_ERROR_IN_DIGEST_FN';
	exports[3678] = 'ER_SCHEMA_DIR_EXISTS';
	exports[3679] = 'ER_SCHEMA_DIR_MISSING';
	exports[3680] = 'ER_SCHEMA_DIR_CREATE_FAILED';
	exports[3681] = 'ER_SCHEMA_DIR_UNKNOWN';
	exports[3682] = 'ER_ONLY_IMPLEMENTED_FOR_SRID_0_AND_4326';
	exports[3683] = 'ER_BINLOG_EXPIRE_LOG_DAYS_AND_SECS_USED_TOGETHER';
	exports[3684] = 'ER_REGEXP_BUFFER_OVERFLOW';
	exports[3685] = 'ER_REGEXP_ILLEGAL_ARGUMENT';
	exports[3686] = 'ER_REGEXP_INDEX_OUTOFBOUNDS_ERROR';
	exports[3687] = 'ER_REGEXP_INTERNAL_ERROR';
	exports[3688] = 'ER_REGEXP_RULE_SYNTAX';
	exports[3689] = 'ER_REGEXP_BAD_ESCAPE_SEQUENCE';
	exports[3690] = 'ER_REGEXP_UNIMPLEMENTED';
	exports[3691] = 'ER_REGEXP_MISMATCHED_PAREN';
	exports[3692] = 'ER_REGEXP_BAD_INTERVAL';
	exports[3693] = 'ER_REGEXP_MAX_LT_MIN';
	exports[3694] = 'ER_REGEXP_INVALID_BACK_REF';
	exports[3695] = 'ER_REGEXP_LOOK_BEHIND_LIMIT';
	exports[3696] = 'ER_REGEXP_MISSING_CLOSE_BRACKET';
	exports[3697] = 'ER_REGEXP_INVALID_RANGE';
	exports[3698] = 'ER_REGEXP_STACK_OVERFLOW';
	exports[3699] = 'ER_REGEXP_TIME_OUT';
	exports[3700] = 'ER_REGEXP_PATTERN_TOO_BIG';
	exports[3701] = 'ER_CANT_SET_ERROR_LOG_SERVICE';
	exports[3702] = 'ER_EMPTY_PIPELINE_FOR_ERROR_LOG_SERVICE';
	exports[3703] = 'ER_COMPONENT_FILTER_DIAGNOSTICS';
	exports[3704] = 'ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS';
	exports[3705] = 'ER_NOT_IMPLEMENTED_FOR_PROJECTED_SRS';
	exports[3706] = 'ER_NONPOSITIVE_RADIUS';
	exports[3707] = 'ER_RESTART_SERVER_FAILED';
	exports[3708] = 'ER_SRS_MISSING_MANDATORY_ATTRIBUTE';
	exports[3709] = 'ER_SRS_MULTIPLE_ATTRIBUTE_DEFINITIONS';
	exports[3710] = 'ER_SRS_NAME_CANT_BE_EMPTY_OR_WHITESPACE';
	exports[3711] = 'ER_SRS_ORGANIZATION_CANT_BE_EMPTY_OR_WHITESPACE';
	exports[3712] = 'ER_SRS_ID_ALREADY_EXISTS';
	exports[3713] = 'ER_WARN_SRS_ID_ALREADY_EXISTS';
	exports[3714] = 'ER_CANT_MODIFY_SRID_0';
	exports[3715] = 'ER_WARN_RESERVED_SRID_RANGE';
	exports[3716] = 'ER_CANT_MODIFY_SRS_USED_BY_COLUMN';
	exports[3717] = 'ER_SRS_INVALID_CHARACTER_IN_ATTRIBUTE';
	exports[3718] = 'ER_SRS_ATTRIBUTE_STRING_TOO_LONG';
	exports[3719] = 'ER_DEPRECATED_UTF8_ALIAS';
	exports[3720] = 'ER_DEPRECATED_NATIONAL';
	exports[3721] = 'ER_INVALID_DEFAULT_UTF8MB4_COLLATION';
	exports[3722] = 'ER_UNABLE_TO_COLLECT_LOG_STATUS';
	exports[3723] = 'ER_RESERVED_TABLESPACE_NAME';
	exports[3724] = 'ER_UNABLE_TO_SET_OPTION';
	exports[3725] = 'ER_REPLICA_POSSIBLY_DIVERGED_AFTER_DDL';
	exports[3726] = 'ER_SRS_NOT_GEOGRAPHIC';
	exports[3727] = 'ER_POLYGON_TOO_LARGE';
	exports[3728] = 'ER_SPATIAL_UNIQUE_INDEX';
	exports[3729] = 'ER_INDEX_TYPE_NOT_SUPPORTED_FOR_SPATIAL_INDEX';
	exports[3730] = 'ER_FK_CANNOT_DROP_PARENT';
	exports[3731] = 'ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE';
	exports[3732] = 'ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE';
	exports[3733] = 'ER_FK_CANNOT_USE_VIRTUAL_COLUMN';
	exports[3734] = 'ER_FK_NO_COLUMN_PARENT';
	exports[3735] = 'ER_CANT_SET_ERROR_SUPPRESSION_LIST';
	exports[3736] = 'ER_SRS_GEOGCS_INVALID_AXES';
	exports[3737] = 'ER_SRS_INVALID_SEMI_MAJOR_AXIS';
	exports[3738] = 'ER_SRS_INVALID_INVERSE_FLATTENING';
	exports[3739] = 'ER_SRS_INVALID_ANGULAR_UNIT';
	exports[3740] = 'ER_SRS_INVALID_PRIME_MERIDIAN';
	exports[3741] = 'ER_TRANSFORM_SOURCE_SRS_NOT_SUPPORTED';
	exports[3742] = 'ER_TRANSFORM_TARGET_SRS_NOT_SUPPORTED';
	exports[3743] = 'ER_TRANSFORM_SOURCE_SRS_MISSING_TOWGS84';
	exports[3744] = 'ER_TRANSFORM_TARGET_SRS_MISSING_TOWGS84';
	exports[3745] = 'ER_TEMP_TABLE_PREVENTS_SWITCH_SESSION_BINLOG_FORMAT';
	exports[3746] = 'ER_TEMP_TABLE_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT';
	exports[3747] = 'ER_RUNNING_APPLIER_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT';
	exports[3748] = 'ER_CLIENT_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRX_IN_SBR';
	exports[3749] = 'ER_XA_CANT_CREATE_MDL_BACKUP';
	exports[3750] = 'ER_TABLE_WITHOUT_PK';
	exports[3751] = 'ER_WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX';
	exports[3752] = 'ER_WARN_DATA_OUT_OF_RANGE_FUNCTIONAL_INDEX';
	exports[3753] = 'ER_FUNCTIONAL_INDEX_ON_JSON_OR_GEOMETRY_FUNCTION';
	exports[3754] = 'ER_FUNCTIONAL_INDEX_REF_AUTO_INCREMENT';
	exports[3755] = 'ER_CANNOT_DROP_COLUMN_FUNCTIONAL_INDEX';
	exports[3756] = 'ER_FUNCTIONAL_INDEX_PRIMARY_KEY';
	exports[3757] = 'ER_FUNCTIONAL_INDEX_ON_LOB';
	exports[3758] = 'ER_FUNCTIONAL_INDEX_FUNCTION_IS_NOT_ALLOWED';
	exports[3759] = 'ER_FULLTEXT_FUNCTIONAL_INDEX';
	exports[3760] = 'ER_SPATIAL_FUNCTIONAL_INDEX';
	exports[3761] = 'ER_WRONG_KEY_COLUMN_FUNCTIONAL_INDEX';
	exports[3762] = 'ER_FUNCTIONAL_INDEX_ON_FIELD';
	exports[3763] = 'ER_GENERATED_COLUMN_NAMED_FUNCTION_IS_NOT_ALLOWED';
	exports[3764] = 'ER_GENERATED_COLUMN_ROW_VALUE';
	exports[3765] = 'ER_GENERATED_COLUMN_VARIABLES';
	exports[3766] = 'ER_DEPENDENT_BY_DEFAULT_GENERATED_VALUE';
	exports[3767] = 'ER_DEFAULT_VAL_GENERATED_NON_PRIOR';
	exports[3768] = 'ER_DEFAULT_VAL_GENERATED_REF_AUTO_INC';
	exports[3769] = 'ER_DEFAULT_VAL_GENERATED_FUNCTION_IS_NOT_ALLOWED';
	exports[3770] = 'ER_DEFAULT_VAL_GENERATED_NAMED_FUNCTION_IS_NOT_ALLOWED';
	exports[3771] = 'ER_DEFAULT_VAL_GENERATED_ROW_VALUE';
	exports[3772] = 'ER_DEFAULT_VAL_GENERATED_VARIABLES';
	exports[3773] = 'ER_DEFAULT_AS_VAL_GENERATED';
	exports[3774] = 'ER_UNSUPPORTED_ACTION_ON_DEFAULT_VAL_GENERATED';
	exports[3775] = 'ER_GTID_UNSAFE_ALTER_ADD_COL_WITH_DEFAULT_EXPRESSION';
	exports[3776] = 'ER_FK_CANNOT_CHANGE_ENGINE';
	exports[3777] = 'ER_WARN_DEPRECATED_USER_SET_EXPR';
	exports[3778] = 'ER_WARN_DEPRECATED_UTF8MB3_COLLATION';
	exports[3779] = 'ER_WARN_DEPRECATED_NESTED_COMMENT_SYNTAX';
	exports[3780] = 'ER_FK_INCOMPATIBLE_COLUMNS';
	exports[3781] = 'ER_GR_HOLD_WAIT_TIMEOUT';
	exports[3782] = 'ER_GR_HOLD_KILLED';
	exports[3783] = 'ER_GR_HOLD_MEMBER_STATUS_ERROR';
	exports[3784] = 'ER_RPL_ENCRYPTION_FAILED_TO_FETCH_KEY';
	exports[3785] = 'ER_RPL_ENCRYPTION_KEY_NOT_FOUND';
	exports[3786] = 'ER_RPL_ENCRYPTION_KEYRING_INVALID_KEY';
	exports[3787] = 'ER_RPL_ENCRYPTION_HEADER_ERROR';
	exports[3788] = 'ER_RPL_ENCRYPTION_FAILED_TO_ROTATE_LOGS';
	exports[3789] = 'ER_RPL_ENCRYPTION_KEY_EXISTS_UNEXPECTED';
	exports[3790] = 'ER_RPL_ENCRYPTION_FAILED_TO_GENERATE_KEY';
	exports[3791] = 'ER_RPL_ENCRYPTION_FAILED_TO_STORE_KEY';
	exports[3792] = 'ER_RPL_ENCRYPTION_FAILED_TO_REMOVE_KEY';
	exports[3793] = 'ER_RPL_ENCRYPTION_UNABLE_TO_CHANGE_OPTION';
	exports[3794] = 'ER_RPL_ENCRYPTION_MASTER_KEY_RECOVERY_FAILED';
	exports[3795] = 'ER_SLOW_LOG_MODE_IGNORED_WHEN_NOT_LOGGING_TO_FILE';
	exports[3796] = 'ER_GRP_TRX_CONSISTENCY_NOT_ALLOWED';
	exports[3797] = 'ER_GRP_TRX_CONSISTENCY_BEFORE';
	exports[3798] = 'ER_GRP_TRX_CONSISTENCY_AFTER_ON_TRX_BEGIN';
	exports[3799] = 'ER_GRP_TRX_CONSISTENCY_BEGIN_NOT_ALLOWED';
	exports[3800] = 'ER_FUNCTIONAL_INDEX_ROW_VALUE_IS_NOT_ALLOWED';
	exports[3801] = 'ER_RPL_ENCRYPTION_FAILED_TO_ENCRYPT';
	exports[3802] = 'ER_PAGE_TRACKING_NOT_STARTED';
	exports[3803] = 'ER_PAGE_TRACKING_RANGE_NOT_TRACKED';
	exports[3804] = 'ER_PAGE_TRACKING_CANNOT_PURGE';
	exports[3805] = 'ER_RPL_ENCRYPTION_CANNOT_ROTATE_BINLOG_MASTER_KEY';
	exports[3806] = 'ER_BINLOG_MASTER_KEY_RECOVERY_OUT_OF_COMBINATION';
	exports[3807] = 'ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_OPERATE_KEY';
	exports[3808] = 'ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_ROTATE_LOGS';
	exports[3809] = 'ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_REENCRYPT_LOG';
	exports[3810] = 'ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_UNUSED_KEYS';
	exports[3811] = 'ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_AUX_KEY';
	exports[3812] = 'ER_NON_BOOLEAN_EXPR_FOR_CHECK_CONSTRAINT';
	exports[3813] = 'ER_COLUMN_CHECK_CONSTRAINT_REFERENCES_OTHER_COLUMN';
	exports[3814] = 'ER_CHECK_CONSTRAINT_NAMED_FUNCTION_IS_NOT_ALLOWED';
	exports[3815] = 'ER_CHECK_CONSTRAINT_FUNCTION_IS_NOT_ALLOWED';
	exports[3816] = 'ER_CHECK_CONSTRAINT_VARIABLES';
	exports[3817] = 'ER_CHECK_CONSTRAINT_ROW_VALUE';
	exports[3818] = 'ER_CHECK_CONSTRAINT_REFERS_AUTO_INCREMENT_COLUMN';
	exports[3819] = 'ER_CHECK_CONSTRAINT_VIOLATED';
	exports[3820] = 'ER_CHECK_CONSTRAINT_REFERS_UNKNOWN_COLUMN';
	exports[3821] = 'ER_CHECK_CONSTRAINT_NOT_FOUND';
	exports[3822] = 'ER_CHECK_CONSTRAINT_DUP_NAME';
	exports[3823] = 'ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN';
	exports[3824] = 'WARN_UNENCRYPTED_TABLE_IN_ENCRYPTED_DB';
	exports[3825] = 'ER_INVALID_ENCRYPTION_REQUEST';
	exports[3826] = 'ER_CANNOT_SET_TABLE_ENCRYPTION';
	exports[3827] = 'ER_CANNOT_SET_DATABASE_ENCRYPTION';
	exports[3828] = 'ER_CANNOT_SET_TABLESPACE_ENCRYPTION';
	exports[3829] = 'ER_TABLESPACE_CANNOT_BE_ENCRYPTED';
	exports[3830] = 'ER_TABLESPACE_CANNOT_BE_DECRYPTED';
	exports[3831] = 'ER_TABLESPACE_TYPE_UNKNOWN';
	exports[3832] = 'ER_TARGET_TABLESPACE_UNENCRYPTED';
	exports[3833] = 'ER_CANNOT_USE_ENCRYPTION_CLAUSE';
	exports[3834] = 'ER_INVALID_MULTIPLE_CLAUSES';
	exports[3835] = 'ER_UNSUPPORTED_USE_OF_GRANT_AS';
	exports[3836] = 'ER_UKNOWN_AUTH_ID_OR_ACCESS_DENIED_FOR_GRANT_AS';
	exports[3837] = 'ER_DEPENDENT_BY_FUNCTIONAL_INDEX';
	exports[3838] = 'ER_PLUGIN_NOT_EARLY';
	exports[3839] = 'ER_INNODB_REDO_LOG_ARCHIVE_START_SUBDIR_PATH';
	exports[3840] = 'ER_INNODB_REDO_LOG_ARCHIVE_START_TIMEOUT';
	exports[3841] = 'ER_INNODB_REDO_LOG_ARCHIVE_DIRS_INVALID';
	exports[3842] = 'ER_INNODB_REDO_LOG_ARCHIVE_LABEL_NOT_FOUND';
	exports[3843] = 'ER_INNODB_REDO_LOG_ARCHIVE_DIR_EMPTY';
	exports[3844] = 'ER_INNODB_REDO_LOG_ARCHIVE_NO_SUCH_DIR';
	exports[3845] = 'ER_INNODB_REDO_LOG_ARCHIVE_DIR_CLASH';
	exports[3846] = 'ER_INNODB_REDO_LOG_ARCHIVE_DIR_PERMISSIONS';
	exports[3847] = 'ER_INNODB_REDO_LOG_ARCHIVE_FILE_CREATE';
	exports[3848] = 'ER_INNODB_REDO_LOG_ARCHIVE_ACTIVE';
	exports[3849] = 'ER_INNODB_REDO_LOG_ARCHIVE_INACTIVE';
	exports[3850] = 'ER_INNODB_REDO_LOG_ARCHIVE_FAILED';
	exports[3851] = 'ER_INNODB_REDO_LOG_ARCHIVE_SESSION';
	exports[3852] = 'ER_STD_REGEX_ERROR';
	exports[3853] = 'ER_INVALID_JSON_TYPE';
	exports[3854] = 'ER_CANNOT_CONVERT_STRING';
	exports[3855] = 'ER_DEPENDENT_BY_PARTITION_FUNC';
	exports[3856] = 'ER_WARN_DEPRECATED_FLOAT_AUTO_INCREMENT';
	exports[3857] = 'ER_RPL_CANT_STOP_REPLICA_WHILE_LOCKED_BACKUP';
	exports[3858] = 'ER_WARN_DEPRECATED_FLOAT_DIGITS';
	exports[3859] = 'ER_WARN_DEPRECATED_FLOAT_UNSIGNED';
	exports[3860] = 'ER_WARN_DEPRECATED_INTEGER_DISPLAY_WIDTH';
	exports[3861] = 'ER_WARN_DEPRECATED_ZEROFILL';
	exports[3862] = 'ER_CLONE_DONOR';
	exports[3863] = 'ER_CLONE_PROTOCOL';
	exports[3864] = 'ER_CLONE_DONOR_VERSION';
	exports[3865] = 'ER_CLONE_OS';
	exports[3866] = 'ER_CLONE_PLATFORM';
	exports[3867] = 'ER_CLONE_CHARSET';
	exports[3868] = 'ER_CLONE_CONFIG';
	exports[3869] = 'ER_CLONE_SYS_CONFIG';
	exports[3870] = 'ER_CLONE_PLUGIN_MATCH';
	exports[3871] = 'ER_CLONE_LOOPBACK';
	exports[3872] = 'ER_CLONE_ENCRYPTION';
	exports[3873] = 'ER_CLONE_DISK_SPACE';
	exports[3874] = 'ER_CLONE_IN_PROGRESS';
	exports[3875] = 'ER_CLONE_DISALLOWED';
	exports[3876] = 'ER_CANNOT_GRANT_ROLES_TO_ANONYMOUS_USER';
	exports[3877] = 'ER_SECONDARY_ENGINE_PLUGIN';
	exports[3878] = 'ER_SECOND_PASSWORD_CANNOT_BE_EMPTY';
	exports[3879] = 'ER_DB_ACCESS_DENIED';
	exports[3880] = 'ER_DA_AUTH_ID_WITH_SYSTEM_USER_PRIV_IN_MANDATORY_ROLES';
	exports[3881] = 'ER_DA_RPL_GTID_TABLE_CANNOT_OPEN';
	exports[3882] = 'ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT';
	exports[3883] = 'ER_DA_PLUGIN_INSTALL_ERROR';
	exports[3884] = 'ER_NO_SESSION_TEMP';
	exports[3885] = 'ER_DA_UNKNOWN_ERROR_NUMBER';
	exports[3886] = 'ER_COLUMN_CHANGE_SIZE';
	exports[3887] = 'ER_REGEXP_INVALID_CAPTURE_GROUP_NAME';
	exports[3888] = 'ER_DA_SSL_LIBRARY_ERROR';
	exports[3889] = 'ER_SECONDARY_ENGINE';
	exports[3890] = 'ER_SECONDARY_ENGINE_DDL';
	exports[3891] = 'ER_INCORRECT_CURRENT_PASSWORD';
	exports[3892] = 'ER_MISSING_CURRENT_PASSWORD';
	exports[3893] = 'ER_CURRENT_PASSWORD_NOT_REQUIRED';
	exports[3894] = 'ER_PASSWORD_CANNOT_BE_RETAINED_ON_PLUGIN_CHANGE';
	exports[3895] = 'ER_CURRENT_PASSWORD_CANNOT_BE_RETAINED';
	exports[3896] = 'ER_PARTIAL_REVOKES_EXIST';
	exports[3897] = 'ER_CANNOT_GRANT_SYSTEM_PRIV_TO_MANDATORY_ROLE';
	exports[3898] = 'ER_XA_REPLICATION_FILTERS';
	exports[3899] = 'ER_UNSUPPORTED_SQL_MODE';
	exports[3900] = 'ER_REGEXP_INVALID_FLAG';
	exports[3901] = 'ER_PARTIAL_REVOKE_AND_DB_GRANT_BOTH_EXISTS';
	exports[3902] = 'ER_UNIT_NOT_FOUND';
	exports[3903] = 'ER_INVALID_JSON_VALUE_FOR_FUNC_INDEX';
	exports[3904] = 'ER_JSON_VALUE_OUT_OF_RANGE_FOR_FUNC_INDEX';
	exports[3905] = 'ER_EXCEEDED_MV_KEYS_NUM';
	exports[3906] = 'ER_EXCEEDED_MV_KEYS_SPACE';
	exports[3907] = 'ER_FUNCTIONAL_INDEX_DATA_IS_TOO_LONG';
	exports[3908] = 'ER_WRONG_MVI_VALUE';
	exports[3909] = 'ER_WARN_FUNC_INDEX_NOT_APPLICABLE';
	exports[3910] = 'ER_GRP_RPL_UDF_ERROR';
	exports[3911] = 'ER_UPDATE_GTID_PURGED_WITH_GR';
	exports[3912] = 'ER_GROUPING_ON_TIMESTAMP_IN_DST';
	exports[3913] = 'ER_TABLE_NAME_CAUSES_TOO_LONG_PATH';
	exports[3914] = 'ER_AUDIT_LOG_INSUFFICIENT_PRIVILEGE';
	exports[3915] = 'ER_AUDIT_LOG_PASSWORD_HAS_BEEN_COPIED';
	exports[3916] = 'ER_DA_GRP_RPL_STARTED_AUTO_REJOIN';
	exports[3917] = 'ER_SYSVAR_CHANGE_DURING_QUERY';
	exports[3918] = 'ER_GLOBSTAT_CHANGE_DURING_QUERY';
	exports[3919] = 'ER_GRP_RPL_MESSAGE_SERVICE_INIT_FAILURE';
	exports[3920] = 'ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_CLIENT';
	exports[3921] = 'ER_CHANGE_SOURCE_WRONG_COMPRESSION_LEVEL_CLIENT';
	exports[3922] = 'ER_WRONG_COMPRESSION_ALGORITHM_CLIENT';
	exports[3923] = 'ER_WRONG_COMPRESSION_LEVEL_CLIENT';
	exports[3924] = 'ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_LIST_CLIENT';
	exports[3925] = 'ER_CLIENT_PRIVILEGE_CHECKS_USER_CANNOT_BE_ANONYMOUS';
	exports[3926] = 'ER_CLIENT_PRIVILEGE_CHECKS_USER_DOES_NOT_EXIST';
	exports[3927] = 'ER_CLIENT_PRIVILEGE_CHECKS_USER_CORRUPT';
	exports[3928] = 'ER_CLIENT_PRIVILEGE_CHECKS_USER_NEEDS_RPL_APPLIER_PRIV';
	exports[3929] = 'ER_WARN_DA_PRIVILEGE_NOT_REGISTERED';
	exports[3930] = 'ER_CLIENT_KEYRING_UDF_KEY_INVALID';
	exports[3931] = 'ER_CLIENT_KEYRING_UDF_KEY_TYPE_INVALID';
	exports[3932] = 'ER_CLIENT_KEYRING_UDF_KEY_TOO_LONG';
	exports[3933] = 'ER_CLIENT_KEYRING_UDF_KEY_TYPE_TOO_LONG';
	exports[3934] = 'ER_JSON_SCHEMA_VALIDATION_ERROR_WITH_DETAILED_REPORT';
	exports[3935] = 'ER_DA_UDF_INVALID_CHARSET_SPECIFIED';
	exports[3936] = 'ER_DA_UDF_INVALID_CHARSET';
	exports[3937] = 'ER_DA_UDF_INVALID_COLLATION';
	exports[3938] = 'ER_DA_UDF_INVALID_EXTENSION_ARGUMENT_TYPE';
	exports[3939] = 'ER_MULTIPLE_CONSTRAINTS_WITH_SAME_NAME';
	exports[3940] = 'ER_CONSTRAINT_NOT_FOUND';
	exports[3941] = 'ER_ALTER_CONSTRAINT_ENFORCEMENT_NOT_SUPPORTED';
	exports[3942] = 'ER_TABLE_VALUE_CONSTRUCTOR_MUST_HAVE_COLUMNS';
	exports[3943] = 'ER_TABLE_VALUE_CONSTRUCTOR_CANNOT_HAVE_DEFAULT';
	exports[3944] = 'ER_CLIENT_QUERY_FAILURE_INVALID_NON_ROW_FORMAT';
	exports[3945] = 'ER_REQUIRE_ROW_FORMAT_INVALID_VALUE';
	exports[3946] = 'ER_FAILED_TO_DETERMINE_IF_ROLE_IS_MANDATORY';
	exports[3947] = 'ER_FAILED_TO_FETCH_MANDATORY_ROLE_LIST';
	exports[3948] = 'ER_CLIENT_LOCAL_FILES_DISABLED';
	exports[3949] = 'ER_IMP_INCOMPATIBLE_CFG_VERSION';
	exports[3950] = 'ER_DA_OOM';
	exports[3951] = 'ER_DA_UDF_INVALID_ARGUMENT_TO_SET_CHARSET';
	exports[3952] = 'ER_DA_UDF_INVALID_RETURN_TYPE_TO_SET_CHARSET';
	exports[3953] = 'ER_MULTIPLE_INTO_CLAUSES';
	exports[3954] = 'ER_MISPLACED_INTO';
	exports[3955] =
	  'ER_USER_ACCESS_DENIED_FOR_USER_ACCOUNT_BLOCKED_BY_PASSWORD_LOCK';
	exports[3956] = 'ER_WARN_DEPRECATED_YEAR_UNSIGNED';
	exports[3957] = 'ER_CLONE_NETWORK_PACKET';
	exports[3958] = 'ER_SDI_OPERATION_FAILED_MISSING_RECORD';
	exports[3959] = 'ER_DEPENDENT_BY_CHECK_CONSTRAINT';
	exports[3960] = 'ER_GRP_OPERATION_NOT_ALLOWED_GR_MUST_STOP';
	exports[3961] = 'ER_WARN_DEPRECATED_JSON_TABLE_ON_ERROR_ON_EMPTY';
	exports[3962] = 'ER_WARN_DEPRECATED_INNER_INTO';
	exports[3963] = 'ER_WARN_DEPRECATED_VALUES_FUNCTION_ALWAYS_NULL';
	exports[3964] = 'ER_WARN_DEPRECATED_SQL_CALC_FOUND_ROWS';
	exports[3965] = 'ER_WARN_DEPRECATED_FOUND_ROWS';
	exports[3966] = 'ER_MISSING_JSON_VALUE';
	exports[3967] = 'ER_MULTIPLE_JSON_VALUES';
	exports[3968] = 'ER_HOSTNAME_TOO_LONG';
	exports[3969] = 'ER_WARN_CLIENT_DEPRECATED_PARTITION_PREFIX_KEY';
	exports[3970] = 'ER_GROUP_REPLICATION_USER_EMPTY_MSG';
	exports[3971] = 'ER_GROUP_REPLICATION_USER_MANDATORY_MSG';
	exports[3972] = 'ER_GROUP_REPLICATION_PASSWORD_LENGTH';
	exports[3973] = 'ER_SUBQUERY_TRANSFORM_REJECTED';
	exports[3974] = 'ER_DA_GRP_RPL_RECOVERY_ENDPOINT_FORMAT';
	exports[3975] = 'ER_DA_GRP_RPL_RECOVERY_ENDPOINT_INVALID';
	exports[3976] = 'ER_WRONG_VALUE_FOR_VAR_PLUS_ACTIONABLE_PART';
	exports[3977] = 'ER_STATEMENT_NOT_ALLOWED_AFTER_START_TRANSACTION';
	exports[3978] = 'ER_FOREIGN_KEY_WITH_ATOMIC_CREATE_SELECT';
	exports[3979] = 'ER_NOT_ALLOWED_WITH_START_TRANSACTION';
	exports[3980] = 'ER_INVALID_JSON_ATTRIBUTE';
	exports[3981] = 'ER_ENGINE_ATTRIBUTE_NOT_SUPPORTED';
	exports[3982] = 'ER_INVALID_USER_ATTRIBUTE_JSON';
	exports[3983] = 'ER_INNODB_REDO_DISABLED';
	exports[3984] = 'ER_INNODB_REDO_ARCHIVING_ENABLED';
	exports[3985] = 'ER_MDL_OUT_OF_RESOURCES';
	exports[3986] = 'ER_IMPLICIT_COMPARISON_FOR_JSON';
	exports[3987] = 'ER_FUNCTION_DOES_NOT_SUPPORT_CHARACTER_SET';
	exports[3988] = 'ER_IMPOSSIBLE_STRING_CONVERSION';
	exports[3989] = 'ER_SCHEMA_READ_ONLY';
	exports[3990] = 'ER_RPL_ASYNC_RECONNECT_GTID_MODE_OFF';
	exports[3991] = 'ER_RPL_ASYNC_RECONNECT_AUTO_POSITION_OFF';
	exports[3992] = 'ER_DISABLE_GTID_MODE_REQUIRES_ASYNC_RECONNECT_OFF';
	exports[3993] = 'ER_DISABLE_AUTO_POSITION_REQUIRES_ASYNC_RECONNECT_OFF';
	exports[3994] = 'ER_INVALID_PARAMETER_USE';
	exports[3995] = 'ER_CHARACTER_SET_MISMATCH';
	exports[3996] = 'ER_WARN_VAR_VALUE_CHANGE_NOT_SUPPORTED';
	exports[3997] = 'ER_INVALID_TIME_ZONE_INTERVAL';
	exports[3998] = 'ER_INVALID_CAST';
	exports[3999] = 'ER_HYPERGRAPH_NOT_SUPPORTED_YET';
	exports[4000] = 'ER_WARN_HYPERGRAPH_EXPERIMENTAL';
	exports[4001] = 'ER_DA_NO_ERROR_LOG_PARSER_CONFIGURED';
	exports[4002] = 'ER_DA_ERROR_LOG_TABLE_DISABLED';
	exports[4003] = 'ER_DA_ERROR_LOG_MULTIPLE_FILTERS';
	exports[4004] = 'ER_DA_CANT_OPEN_ERROR_LOG';
	exports[4005] = 'ER_USER_REFERENCED_AS_DEFINER';
	exports[4006] = 'ER_CANNOT_USER_REFERENCED_AS_DEFINER';
	exports[4007] = 'ER_REGEX_NUMBER_TOO_BIG';
	exports[4008] = 'ER_SPVAR_NONINTEGER_TYPE';
	exports[4009] = 'WARN_UNSUPPORTED_ACL_TABLES_READ';
	exports[4010] = 'ER_BINLOG_UNSAFE_ACL_TABLE_READ_IN_DML_DDL';
	exports[4011] = 'ER_STOP_REPLICA_MONITOR_IO_THREAD_TIMEOUT';
	exports[4012] = 'ER_STARTING_REPLICA_MONITOR_IO_THREAD';
	exports[4013] = 'ER_CANT_USE_ANONYMOUS_TO_GTID_WITH_GTID_MODE_NOT_ON';
	exports[4014] = 'ER_CANT_COMBINE_ANONYMOUS_TO_GTID_AND_AUTOPOSITION';
	exports[4015] =
	  'ER_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_REQUIRES_GTID_MODE_ON';
	exports[4016] = 'ER_SQL_REPLICA_SKIP_COUNTER_USED_WITH_GTID_MODE_ON';
	exports[4017] =
	  'ER_USING_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_AS_LOCAL_OR_UUID';
	exports[4018] =
	  'ER_CANT_SET_ANONYMOUS_TO_GTID_AND_WAIT_UNTIL_SQL_THD_AFTER_GTIDS';
	exports[4019] = 'ER_CANT_SET_SQL_AFTER_OR_BEFORE_GTIDS_WITH_ANONYMOUS_TO_GTID';
	exports[4020] = 'ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_GROUP_NAME';
	exports[4021] = 'ER_CANT_USE_SAME_UUID_AS_GROUP_NAME';
	exports[4022] = 'ER_GRP_RPL_RECOVERY_CHANNEL_STILL_RUNNING';
	exports[4023] = 'ER_INNODB_INVALID_AUTOEXTEND_SIZE_VALUE';
	exports[4024] = 'ER_INNODB_INCOMPATIBLE_WITH_TABLESPACE';
	exports[4025] = 'ER_INNODB_AUTOEXTEND_SIZE_OUT_OF_RANGE';
	exports[4026] = 'ER_CANNOT_USE_AUTOEXTEND_SIZE_CLAUSE';
	exports[4027] = 'ER_ROLE_GRANTED_TO_ITSELF';
	exports[4028] = 'ER_TABLE_MUST_HAVE_A_VISIBLE_COLUMN';
	exports[4029] = 'ER_INNODB_COMPRESSION_FAILURE';
	exports[4030] = 'ER_WARN_ASYNC_CONN_FAILOVER_NETWORK_NAMESPACE';
	exports[4031] = 'ER_CLIENT_INTERACTION_TIMEOUT';
	exports[4032] = 'ER_INVALID_CAST_TO_GEOMETRY';
	exports[4033] = 'ER_INVALID_CAST_POLYGON_RING_DIRECTION';
	exports[4034] = 'ER_GIS_DIFFERENT_SRIDS_AGGREGATION';
	exports[4035] = 'ER_RELOAD_KEYRING_FAILURE';
	exports[4036] = 'ER_SDI_GET_KEYS_INVALID_TABLESPACE';
	exports[4037] = 'ER_CHANGE_RPL_SRC_WRONG_COMPRESSION_ALGORITHM_SIZE';
	exports[4038] = 'ER_WARN_DEPRECATED_TLS_VERSION_FOR_CHANNEL_CLI';
	exports[4039] = 'ER_CANT_USE_SAME_UUID_AS_VIEW_CHANGE_UUID';
	exports[4040] = 'ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_VIEW_CHANGE_UUID';
	exports[4041] = 'ER_GRP_RPL_VIEW_CHANGE_UUID_FAIL_GET_VARIABLE';
	exports[4042] = 'ER_WARN_ADUIT_LOG_MAX_SIZE_AND_PRUNE_SECONDS';
	exports[4043] = 'ER_WARN_ADUIT_LOG_MAX_SIZE_CLOSE_TO_ROTATE_ON_SIZE';
	exports[4044] = 'ER_KERBEROS_CREATE_USER';
	exports[4045] = 'ER_INSTALL_PLUGIN_CONFLICT_CLIENT';
	exports[4046] = 'ER_DA_ERROR_LOG_COMPONENT_FLUSH_FAILED';
	exports[4047] = 'ER_WARN_SQL_AFTER_MTS_GAPS_GAP_NOT_CALCULATED';
	exports[4048] = 'ER_INVALID_ASSIGNMENT_TARGET';
	exports[4049] = 'ER_OPERATION_NOT_ALLOWED_ON_GR_SECONDARY';
	exports[4050] = 'ER_GRP_RPL_FAILOVER_CHANNEL_STATUS_PROPAGATION';
	exports[4051] = 'ER_WARN_AUDIT_LOG_FORMAT_UNIX_TIMESTAMP_ONLY_WHEN_JSON';
	exports[4052] = 'ER_INVALID_MFA_PLUGIN_SPECIFIED';
	exports[4053] = 'ER_IDENTIFIED_BY_UNSUPPORTED';
	exports[4054] = 'ER_INVALID_PLUGIN_FOR_REGISTRATION';
	exports[4055] = 'ER_PLUGIN_REQUIRES_REGISTRATION';
	exports[4056] = 'ER_MFA_METHOD_EXISTS';
	exports[4057] = 'ER_MFA_METHOD_NOT_EXISTS';
	exports[4058] = 'ER_AUTHENTICATION_POLICY_MISMATCH';
	exports[4059] = 'ER_PLUGIN_REGISTRATION_DONE';
	exports[4060] = 'ER_INVALID_USER_FOR_REGISTRATION';
	exports[4061] = 'ER_USER_REGISTRATION_FAILED';
	exports[4062] = 'ER_MFA_METHODS_INVALID_ORDER';
	exports[4063] = 'ER_MFA_METHODS_IDENTICAL';
	exports[4064] = 'ER_INVALID_MFA_OPERATIONS_FOR_PASSWORDLESS_USER';
	exports[4065] = 'ER_CHANGE_REPLICATION_SOURCE_NO_OPTIONS_FOR_GTID_ONLY';
	exports[4066] =
	  'ER_CHANGE_REP_SOURCE_CANT_DISABLE_REQ_ROW_FORMAT_WITH_GTID_ONLY';
	exports[4067] =
	  'ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POSITION_WITH_GTID_ONLY';
	exports[4068] = 'ER_CHANGE_REP_SOURCE_CANT_DISABLE_GTID_ONLY_WITHOUT_POSITIONS';
	exports[4069] = 'ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POS_WITHOUT_POSITIONS';
	exports[4070] = 'ER_CHANGE_REP_SOURCE_GR_CHANNEL_WITH_GTID_MODE_NOT_ON';
	exports[4071] = 'ER_CANT_USE_GTID_ONLY_WITH_GTID_MODE_NOT_ON';
	exports[4072] = 'ER_WARN_C_DISABLE_GTID_ONLY_WITH_SOURCE_AUTO_POS_INVALID_POS';
	exports[4073] = 'ER_DA_SSL_FIPS_MODE_ERROR';
	exports[4074] = 'ER_VALUE_OUT_OF_RANGE';
	exports[4075] = 'ER_FULLTEXT_WITH_ROLLUP';
	exports[4076] = 'ER_REGEXP_MISSING_RESOURCE';
	exports[4077] = 'ER_WARN_REGEXP_USING_DEFAULT';
	exports[4078] = 'ER_REGEXP_MISSING_FILE';
	exports[4079] = 'ER_WARN_DEPRECATED_COLLATION';
	exports[4080] = 'ER_CONCURRENT_PROCEDURE_USAGE';
	exports[4081] = 'ER_DA_GLOBAL_CONN_LIMIT';
	exports[4082] = 'ER_DA_CONN_LIMIT';
	exports[4083] = 'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE_INSTANT';
	exports[4084] = 'ER_WARN_SF_UDF_NAME_COLLISION';
	exports[4085] = 'ER_CANNOT_PURGE_BINLOG_WITH_BACKUP_LOCK';
	exports[4086] = 'ER_TOO_MANY_WINDOWS';
	exports[4087] = 'ER_MYSQLBACKUP_CLIENT_MSG';
	exports[4088] = 'ER_COMMENT_CONTAINS_INVALID_STRING';
	exports[4089] = 'ER_DEFINITION_CONTAINS_INVALID_STRING';
	exports[4090] = 'ER_CANT_EXECUTE_COMMAND_WITH_ASSIGNED_GTID_NEXT';
	exports[4091] = 'ER_XA_TEMP_TABLE';
	exports[4092] = 'ER_INNODB_MAX_ROW_VERSION';
	exports[4093] = 'ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_SIZE';
	exports[4094] = 'ER_OPERATION_NOT_ALLOWED_WHILE_PRIMARY_CHANGE_IS_RUNNING';
	exports[4095] = 'ER_WARN_DEPRECATED_DATETIME_DELIMITER';
	exports[4096] = 'ER_WARN_DEPRECATED_SUPERFLUOUS_DELIMITER';
	exports[4097] = 'ER_CANNOT_PERSIST_SENSITIVE_VARIABLES';
	exports[4098] = 'ER_WARN_CANNOT_SECURELY_PERSIST_SENSITIVE_VARIABLES';
	exports[4099] = 'ER_WARN_TRG_ALREADY_EXISTS';
	exports[4100] = 'ER_IF_NOT_EXISTS_UNSUPPORTED_TRG_EXISTS_ON_DIFFERENT_TABLE';
	exports[4101] = 'ER_IF_NOT_EXISTS_UNSUPPORTED_UDF_NATIVE_FCT_NAME_COLLISION';
	exports[4102] = 'ER_SET_PASSWORD_AUTH_PLUGIN_ERROR';
	exports[4103] = 'ER_REDUCED_DBLWR_FILE_CORRUPTED';
	exports[4104] = 'ER_REDUCED_DBLWR_PAGE_FOUND';
	exports[4105] = 'ER_SRS_INVALID_LATITUDE_OF_ORIGIN';
	exports[4106] = 'ER_SRS_INVALID_LONGITUDE_OF_ORIGIN';
	exports[4107] = 'ER_SRS_UNUSED_PROJ_PARAMETER_PRESENT';
	exports[4108] = 'ER_GIPK_COLUMN_EXISTS';
	exports[4109] = 'ER_GIPK_FAILED_AUTOINC_COLUMN_EXISTS';
	exports[4110] = 'ER_GIPK_COLUMN_ALTER_NOT_ALLOWED';
	exports[4111] = 'ER_DROP_PK_COLUMN_TO_DROP_GIPK';
	exports[4112] = 'ER_CREATE_SELECT_WITH_GIPK_DISALLOWED_IN_SBR';
	exports[4113] = 'ER_DA_EXPIRE_LOGS_DAYS_IGNORED';
	exports[4114] = 'ER_CTE_RECURSIVE_NOT_UNION';
	exports[4115] = 'ER_COMMAND_BACKEND_FAILED_TO_FETCH_SECURITY_CTX';
	exports[4116] = 'ER_COMMAND_SERVICE_BACKEND_FAILED';
	exports[4117] = 'ER_CLIENT_FILE_PRIVILEGE_FOR_REPLICATION_CHECKS';
	exports[4118] = 'ER_GROUP_REPLICATION_FORCE_MEMBERS_COMMAND_FAILURE';
	exports[4119] = 'ER_WARN_DEPRECATED_IDENT';
	exports[4120] = 'ER_INTERSECT_ALL_MAX_DUPLICATES_EXCEEDED';
	exports[4121] = 'ER_TP_QUERY_THRS_PER_GRP_EXCEEDS_TXN_THR_LIMIT';
	exports[4122] = 'ER_BAD_TIMESTAMP_FORMAT';
	exports[4123] = 'ER_SHAPE_PRIDICTION_UDF';
	exports[4124] = 'ER_SRS_INVALID_HEIGHT';
	exports[4125] = 'ER_SRS_INVALID_SCALING';
	exports[4126] = 'ER_SRS_INVALID_ZONE_WIDTH';
	exports[4127] = 'ER_SRS_INVALID_LATITUDE_POLAR_STERE_VAR_A';
	exports[4128] = 'ER_WARN_DEPRECATED_CLIENT_NO_SCHEMA_OPTION';
	exports[4129] = 'ER_TABLE_NOT_EMPTY';
	exports[4130] = 'ER_TABLE_NO_PRIMARY_KEY';
	exports[4131] = 'ER_TABLE_IN_SHARED_TABLESPACE';
	exports[4132] = 'ER_INDEX_OTHER_THAN_PK';
	exports[4133] = 'ER_LOAD_BULK_DATA_UNSORTED';
	exports[4134] = 'ER_BULK_EXECUTOR_ERROR';
	exports[4135] = 'ER_BULK_READER_LIBCURL_INIT_FAILED';
	exports[4136] = 'ER_BULK_READER_LIBCURL_ERROR';
	exports[4137] = 'ER_BULK_READER_SERVER_ERROR';
	exports[4138] = 'ER_BULK_READER_COMMUNICATION_ERROR';
	exports[4139] = 'ER_BULK_LOAD_DATA_FAILED';
	exports[4140] = 'ER_BULK_LOADER_COLUMN_TOO_BIG_FOR_LEFTOVER_BUFFER';
	exports[4141] = 'ER_BULK_LOADER_COMPONENT_ERROR';
	exports[4142] = 'ER_BULK_LOADER_FILE_CONTAINS_LESS_LINES_THAN_IGNORE_CLAUSE';
	exports[4143] = 'ER_BULK_PARSER_MISSING_ENCLOSED_BY';
	exports[4144] = 'ER_BULK_PARSER_ROW_BUFFER_MAX_TOTAL_COLS_EXCEEDED';
	exports[4145] = 'ER_BULK_PARSER_COPY_BUFFER_SIZE_EXCEEDED';
	exports[4146] = 'ER_BULK_PARSER_UNEXPECTED_END_OF_INPUT';
	exports[4147] = 'ER_BULK_PARSER_UNEXPECTED_ROW_TERMINATOR';
	exports[4148] = 'ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_ENDING_ENCLOSED_BY';
	exports[4149] = 'ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_NULL_ESCAPE';
	exports[4150] = 'ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_COLUMN_TERMINATOR';
	exports[4151] = 'ER_BULK_PARSER_INCOMPLETE_ESCAPE_SEQUENCE';
	exports[4152] = 'ER_LOAD_BULK_DATA_FAILED';
	exports[4153] = 'ER_LOAD_BULK_DATA_WRONG_VALUE_FOR_FIELD';
	exports[4154] = 'ER_LOAD_BULK_DATA_WARN_NULL_TO_NOTNULL';
	exports[4155] = 'ER_REQUIRE_TABLE_PRIMARY_KEY_CHECK_GENERATE_WITH_GR';
	exports[4156] = 'ER_CANT_CHANGE_SYS_VAR_IN_READ_ONLY_MODE';
	exports[4157] = 'ER_INNODB_INSTANT_ADD_DROP_NOT_SUPPORTED_MAX_SIZE';
	exports[4158] = 'ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_FIELDS';
	exports[4159] = 'ER_CANT_SET_PERSISTED';
	exports[4160] = 'ER_INSTALL_COMPONENT_SET_NULL_VALUE';
	exports[4161] = 'ER_INSTALL_COMPONENT_SET_UNUSED_VALUE';
	exports[4162] = 'ER_WARN_DEPRECATED_USER_DEFINED_COLLATIONS'; 
} (errors));

const require$$1 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(buffer);

const require$$2 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(long);

var string = {};

const require$$0$4 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(iconvLite);

const Iconv = require$$0$4;
const { createLRU: createLRU$1 } = require$$7;

const decoderCache = createLRU$1({
  max: 500,
});

string.decode = function (buffer, encoding, start, end, options) {
  if (Buffer.isEncoding(encoding)) {
    return buffer.toString(encoding, start, end);
  }

  // Optimize for common case: encoding="short_string", options=undefined.
  let decoder;
  if (!options) {
    decoder = decoderCache.get(encoding);
    if (!decoder) {
      decoder = Iconv.getDecoder(encoding);
      decoderCache.set(encoding, decoder);
    }
  } else {
    const decoderArgs = { encoding, options };
    const decoderKey = JSON.stringify(decoderArgs);
    decoder = decoderCache.get(decoderKey);
    if (!decoder) {
      decoder = Iconv.getDecoder(decoderArgs.encoding, decoderArgs.options);
      decoderCache.set(decoderKey, decoder);
    }
  }

  const res = decoder.write(buffer.slice(start, end));
  const trail = decoder.end();

  return trail ? res + trail : res;
};

string.encode = function (string, encoding, options) {
  if (Buffer.isEncoding(encoding)) {
    return Buffer.from(string, encoding);
  }

  const encoder = Iconv.getEncoder(encoding, options || {});

  const res = encoder.write(string);
  const trail = encoder.end();

  return trail && trail.length > 0 ? Buffer.concat([res, trail]) : res;
};

var types = {exports: {}};

var hasRequiredTypes;

function requireTypes () {
	if (hasRequiredTypes) return types.exports;
	hasRequiredTypes = 1;

	types.exports = {
	  0x00: 'DECIMAL', // aka DECIMAL
	  0x01: 'TINY', // aka TINYINT, 1 byte
	  0x02: 'SHORT', // aka SMALLINT, 2 bytes
	  0x03: 'LONG', // aka INT, 4 bytes
	  0x04: 'FLOAT', // aka FLOAT, 4-8 bytes
	  0x05: 'DOUBLE', // aka DOUBLE, 8 bytes
	  0x06: 'NULL', // NULL (used for prepared statements, I think)
	  0x07: 'TIMESTAMP', // aka TIMESTAMP
	  0x08: 'LONGLONG', // aka BIGINT, 8 bytes
	  0x09: 'INT24', // aka MEDIUMINT, 3 bytes
	  0x0a: 'DATE', // aka DATE
	  0x0b: 'TIME', // aka TIME
	  0x0c: 'DATETIME', // aka DATETIME
	  0x0d: 'YEAR', // aka YEAR, 1 byte (don't ask)
	  0x0e: 'NEWDATE', // aka ?
	  0x0f: 'VARCHAR', // aka VARCHAR (?)
	  0x10: 'BIT', // aka BIT, 1-8 byte
	  0xf5: 'JSON',
	  0xf6: 'NEWDECIMAL', // aka DECIMAL
	  0xf7: 'ENUM', // aka ENUM
	  0xf8: 'SET', // aka SET
	  0xf9: 'TINY_BLOB', // aka TINYBLOB, TINYTEXT
	  0xfa: 'MEDIUM_BLOB', // aka MEDIUMBLOB, MEDIUMTEXT
	  0xfb: 'LONG_BLOB', // aka LONGBLOG, LONGTEXT
	  0xfc: 'BLOB', // aka BLOB, TEXT
	  0xfd: 'VAR_STRING', // aka VARCHAR, VARBINARY
	  0xfe: 'STRING', // aka CHAR, BINARY
	  0xff: 'GEOMETRY', // aka GEOMETRY
	};

	// Manually extracted from mysql-5.5.23/include/mysql_com.h
	// some more info here: http://dev.mysql.com/doc/refman/5.5/en/c-api-prepared-statement-type-codes.html
	types.exports.DECIMAL = 0x00; // aka DECIMAL (http://dev.mysql.com/doc/refman/5.0/en/precision-math-decimal-changes.html)
	types.exports.TINY = 0x01; // aka TINYINT, 1 byte
	types.exports.SHORT = 0x02; // aka SMALLINT, 2 bytes
	types.exports.LONG = 0x03; // aka INT, 4 bytes
	types.exports.FLOAT = 0x04; // aka FLOAT, 4-8 bytes
	types.exports.DOUBLE = 0x05; // aka DOUBLE, 8 bytes
	types.exports.NULL = 0x06; // NULL (used for prepared statements, I think)
	types.exports.TIMESTAMP = 0x07; // aka TIMESTAMP
	types.exports.LONGLONG = 0x08; // aka BIGINT, 8 bytes
	types.exports.INT24 = 0x09; // aka MEDIUMINT, 3 bytes
	types.exports.DATE = 0x0a; // aka DATE
	types.exports.TIME = 0x0b; // aka TIME
	types.exports.DATETIME = 0x0c; // aka DATETIME
	types.exports.YEAR = 0x0d; // aka YEAR, 1 byte (don't ask)
	types.exports.NEWDATE = 0x0e; // aka ?
	types.exports.VARCHAR = 0x0f; // aka VARCHAR (?)
	types.exports.BIT = 0x10; // aka BIT, 1-8 byte
	types.exports.VECTOR = 0xf2;
	types.exports.JSON = 0xf5;
	types.exports.NEWDECIMAL = 0xf6; // aka DECIMAL
	types.exports.ENUM = 0xf7; // aka ENUM
	types.exports.SET = 0xf8; // aka SET
	types.exports.TINY_BLOB = 0xf9; // aka TINYBLOB, TINYTEXT
	types.exports.MEDIUM_BLOB = 0xfa; // aka MEDIUMBLOB, MEDIUMTEXT
	types.exports.LONG_BLOB = 0xfb; // aka LONGBLOG, LONGTEXT
	types.exports.BLOB = 0xfc; // aka BLOB, TEXT
	types.exports.VAR_STRING = 0xfd; // aka VARCHAR, VARBINARY
	types.exports.STRING = 0xfe; // aka CHAR, BINARY
	types.exports.GEOMETRY = 0xff; // aka GEOMETRY
	return types.exports;
}

const ErrorCodeToName = errors;
const NativeBuffer = require$$1.Buffer;
const Long = require$$2;
const StringParser$3 = string;
const Types$8 = /*@__PURE__*/ requireTypes();
const INVALID_DATE = new Date(NaN);

// this is nearly duplicate of previous function so generated code is not slower
// due to "if (dateStrings)" branching
const pad = '000000000000';
function leftPad(num, value) {
  const s = value.toString();
  // if we don't need to pad
  if (s.length >= num) {
    return s;
  }
  return (pad + s).slice(-num);
}

// The whole reason parse* function below exist
// is because String creation is relatively expensive (at least with V8), and if we have
// a buffer with "12345" content ideally we would like to bypass intermediate
// "12345" string creation and directly build 12345 number out of
// <Buffer 31 32 33 34 35> data.
// In my benchmarks the difference is ~25M 8-digit numbers per second vs
// 4.5 M using Number(packet.readLengthCodedString())
// not used when size is close to max precision as series of *10 accumulate error
// and approximate result mihgt be diffreent from (approximate as well) Number(bigNumStringValue))
// In the futire node version if speed difference is smaller parse* functions might be removed
// don't consider them as Packet public API

const minus = '-'.charCodeAt(0);
const plus = '+'.charCodeAt(0);

// TODO: handle E notation
const dot = '.'.charCodeAt(0);
const exponent = 'e'.charCodeAt(0);
const exponentCapital = 'E'.charCodeAt(0);

let Packet$n = class Packet {
  constructor(id, buffer, start, end) {
    // hot path, enable checks when testing only
    // if (!Buffer.isBuffer(buffer) || typeof start == 'undefined' || typeof end == 'undefined')
    //  throw new Error('invalid packet');
    this.sequenceId = id;
    this.numPackets = 1;
    this.buffer = buffer;
    this.start = start;
    this.offset = start + 4;
    this.end = end;
  }

  // ==============================
  // readers
  // ==============================
  reset() {
    this.offset = this.start + 4;
  }

  length() {
    return this.end - this.start;
  }

  slice() {
    return this.buffer.slice(this.start, this.end);
  }

  dump() {
    console.log(
      [this.buffer.asciiSlice(this.start, this.end)],
      this.buffer.slice(this.start, this.end),
      this.length(),
      this.sequenceId
    );
  }

  haveMoreData() {
    return this.end > this.offset;
  }

  skip(num) {
    this.offset += num;
  }

  readInt8() {
    return this.buffer[this.offset++];
  }

  readInt16() {
    this.offset += 2;
    return this.buffer.readUInt16LE(this.offset - 2);
  }

  readInt24() {
    return this.readInt16() + (this.readInt8() << 16);
  }

  readInt32() {
    this.offset += 4;
    return this.buffer.readUInt32LE(this.offset - 4);
  }

  readSInt8() {
    return this.buffer.readInt8(this.offset++);
  }

  readSInt16() {
    this.offset += 2;
    return this.buffer.readInt16LE(this.offset - 2);
  }

  readSInt32() {
    this.offset += 4;
    return this.buffer.readInt32LE(this.offset - 4);
  }

  readInt64JSNumber() {
    const word0 = this.readInt32();
    const word1 = this.readInt32();
    const l = new Long(word0, word1, true);
    return l.toNumber();
  }

  readSInt64JSNumber() {
    const word0 = this.readInt32();
    const word1 = this.readInt32();
    if (!(word1 & 0x80000000)) {
      return word0 + 0x100000000 * word1;
    }
    const l = new Long(word0, word1, false);
    return l.toNumber();
  }

  readInt64String() {
    const word0 = this.readInt32();
    const word1 = this.readInt32();
    const res = new Long(word0, word1, true);
    return res.toString();
  }

  readSInt64String() {
    const word0 = this.readInt32();
    const word1 = this.readInt32();
    const res = new Long(word0, word1, false);
    return res.toString();
  }

  readInt64() {
    const word0 = this.readInt32();
    const word1 = this.readInt32();
    const res = new Long(word0, word1, true);
    const resNumber = res.toNumber();
    return Number.isSafeInteger(resNumber) ? resNumber : res.toString();
  }

  readSInt64() {
    const word0 = this.readInt32();
    const word1 = this.readInt32();
    const res = new Long(word0, word1, false);
    const resNumber = res.toNumber();
    return Number.isSafeInteger(resNumber) ? resNumber : res.toString();
  }

  isEOF() {
    return this.buffer[this.offset] === 0xfe && this.length() < 13;
  }

  eofStatusFlags() {
    return this.buffer.readInt16LE(this.offset + 3);
  }

  eofWarningCount() {
    return this.buffer.readInt16LE(this.offset + 1);
  }

  readLengthCodedNumber(bigNumberStrings, signed) {
    const byte1 = this.buffer[this.offset++];
    if (byte1 < 251) {
      return byte1;
    }
    return this.readLengthCodedNumberExt(byte1, bigNumberStrings, signed);
  }

  readLengthCodedNumberSigned(bigNumberStrings) {
    return this.readLengthCodedNumber(bigNumberStrings, true);
  }

  readLengthCodedNumberExt(tag, bigNumberStrings, signed) {
    let word0, word1;
    let res;
    if (tag === 0xfb) {
      return null;
    }
    if (tag === 0xfc) {
      return this.readInt8() + (this.readInt8() << 8);
    }
    if (tag === 0xfd) {
      return this.readInt8() + (this.readInt8() << 8) + (this.readInt8() << 16);
    }
    if (tag === 0xfe) {
      // TODO: check version
      // Up to MySQL 3.22, 0xfe was followed by a 4-byte integer.
      word0 = this.readInt32();
      word1 = this.readInt32();
      if (word1 === 0) {
        return word0; // don't convert to float if possible
      }
      if (word1 < 2097152) {
        // max exact float point int, 2^52 / 2^32
        return word1 * 0x100000000 + word0;
      }
      res = new Long(word0, word1, !signed); // Long need unsigned
      const resNumber = res.toNumber();
      const resString = res.toString();
      if (bigNumberStrings || !Number.isSafeInteger(resNumber)) {
        return resString;
      }
      return resNumber;
    }

    console.trace();
    throw new Error(`Should not reach here: ${tag}`);
  }

  readFloat() {
    const res = this.buffer.readFloatLE(this.offset);
    this.offset += 4;
    return res;
  }

  readDouble() {
    const res = this.buffer.readDoubleLE(this.offset);
    this.offset += 8;
    return res;
  }

  readBuffer(len) {
    if (typeof len === 'undefined') {
      len = this.end - this.offset;
    }
    this.offset += len;
    return this.buffer.slice(this.offset - len, this.offset);
  }

  // DATE, DATETIME and TIMESTAMP
  readDateTime(timezone) {
    if (!timezone || timezone === 'Z' || timezone === 'local') {
      const length = this.readInt8();
      if (length === 0xfb) {
        return null;
      }
      let y = 0;
      let m = 0;
      let d = 0;
      let H = 0;
      let M = 0;
      let S = 0;
      let ms = 0;
      if (length > 3) {
        y = this.readInt16();
        m = this.readInt8();
        d = this.readInt8();
      }
      if (length > 6) {
        H = this.readInt8();
        M = this.readInt8();
        S = this.readInt8();
      }
      if (length > 10) {
        ms = this.readInt32() / 1000;
      }
      // NO_ZERO_DATE mode and NO_ZERO_IN_DATE mode are part of the strict
      // default SQL mode used by MySQL 8.0. This means that non-standard
      // dates like '0000-00-00' become NULL. For older versions and other
      // possible MySQL flavours we still need to account for the
      // non-standard behaviour.
      if (y + m + d + H + M + S + ms === 0) {
        return INVALID_DATE;
      }
      if (timezone === 'Z') {
        return new Date(Date.UTC(y, m - 1, d, H, M, S, ms));
      }
      return new Date(y, m - 1, d, H, M, S, ms);
    }
    let str = this.readDateTimeString(6, 'T', null);
    if (!str) {
      return INVALID_DATE;
    }
    if (str.length === 10) {
      str += 'T00:00:00';
    }
    return new Date(str + timezone);
  }

  readDateTimeString(decimals, timeSep, columnType) {
    const length = this.readInt8();
    let y = 0;
    let m = 0;
    let d = 0;
    let H = 0;
    let M = 0;
    let S = 0;
    let ms = 0;
    let str;
    if (length > 3) {
      y = this.readInt16();
      m = this.readInt8();
      d = this.readInt8();
      str = [leftPad(4, y), leftPad(2, m), leftPad(2, d)].join('-');
    }
    if (length > 6) {
      H = this.readInt8();
      M = this.readInt8();
      S = this.readInt8();
      str += `${timeSep || ' '}${[
        leftPad(2, H),
        leftPad(2, M),
        leftPad(2, S),
      ].join(':')}`;
    } else if (
      columnType === Types$8.DATETIME ||
      columnType === Types$8.TIMESTAMP
    ) {
      str += ' 00:00:00';
    }
    if (length > 10) {
      ms = this.readInt32();
      str += '.';
      if (decimals) {
        ms = leftPad(6, ms);
        if (ms.length > decimals) {
          ms = ms.substring(0, decimals); // rounding is done at the MySQL side, only 0 are here
        }
      }
      str += ms;
    }
    return str;
  }

  // TIME - value as a string, Can be negative
  readTimeString(convertTtoMs) {
    const length = this.readInt8();
    if (length === 0) {
      return '00:00:00';
    }
    const sign = this.readInt8() ? -1 : 1; // 'isNegative' flag byte
    let d = 0;
    let H = 0;
    let M = 0;
    let S = 0;
    let ms = 0;
    if (length > 6) {
      d = this.readInt32();
      H = this.readInt8();
      M = this.readInt8();
      S = this.readInt8();
    }
    if (length > 10) {
      ms = this.readInt32();
    }
    if (convertTtoMs) {
      H += d * 24;
      M += H * 60;
      S += M * 60;
      ms += S * 1000;
      ms *= sign;
      return ms;
    }
    // Format follows mySQL TIME format ([-][h]hh:mm:ss[.u[u[u[u[u[u]]]]]])
    // For positive times below 24 hours, this makes it equal to ISO 8601 times
    return (
      (sign === -1 ? '-' : '') +
      [leftPad(2, d * 24 + H), leftPad(2, M), leftPad(2, S)].join(':') +
      (ms ? `.${ms}`.replace(/0+$/, '') : '')
    );
  }

  readLengthCodedString(encoding) {
    const len = this.readLengthCodedNumber();
    // TODO: check manually first byte here to avoid polymorphic return type?
    if (len === null) {
      return null;
    }
    this.offset += len;
    // TODO: Use characterSetCode to get proper encoding
    // https://github.com/sidorares/node-mysql2/pull/374
    return StringParser$3.decode(
      this.buffer,
      encoding,
      this.offset - len,
      this.offset
    );
  }

  readLengthCodedBuffer() {
    const len = this.readLengthCodedNumber();
    if (len === null) {
      return null;
    }
    return this.readBuffer(len);
  }

  readNullTerminatedString(encoding) {
    const start = this.offset;
    let end = this.offset;
    while (end < this.end && this.buffer[end] !== 0x00) {
      end = end + 1;
    }
    this.offset = end + 1;
    return StringParser$3.decode(this.buffer, encoding, start, end);
  }

  // TODO reuse?
  readString(len, encoding) {
    if (typeof len === 'string' && typeof encoding === 'undefined') {
      encoding = len;
      len = undefined;
    }
    if (typeof len === 'undefined') {
      len = this.end - this.offset;
    }
    this.offset += len;
    return StringParser$3.decode(
      this.buffer,
      encoding,
      this.offset - len,
      this.offset
    );
  }

  parseInt(len, supportBigNumbers) {
    if (len === null) {
      return null;
    }
    if (len >= 14 && !supportBigNumbers) {
      const s = this.buffer.toString('ascii', this.offset, this.offset + len);
      this.offset += len;
      return Number(s);
    }
    let result = 0;
    const start = this.offset;
    const end = this.offset + len;
    let sign = 1;
    if (len === 0) {
      return 0; // TODO: assert? exception?
    }
    if (this.buffer[this.offset] === minus) {
      this.offset++;
      sign = -1;
    }
    // max precise int is 9007199254740992
    let str;
    const numDigits = end - this.offset;
    if (supportBigNumbers) {
      if (numDigits >= 15) {
        str = this.readString(end - this.offset, 'binary');
        result = parseInt(str, 10);
        if (Number.isSafeInteger(sign * result)) {
          return sign * result;
        }
        return sign === -1 ? `-${str}` : str;
      }
      if (numDigits > 16) {
        str = this.readString(end - this.offset);
        return sign === -1 ? `-${str}` : str;
      }
    }
    if (this.buffer[this.offset] === plus) {
      this.offset++; // just ignore
    }
    while (this.offset < end) {
      result *= 10;
      result += this.buffer[this.offset] - 48;
      this.offset++;
    }
    const num = result * sign;
    if (!supportBigNumbers) {
      return num;
    }
    if (Number.isSafeInteger(num)) {
      return num;
    }
    return this.buffer.toString('ascii', start, end);
  }

  // note that if value of inputNumberAsString is bigger than MAX_SAFE_INTEGER
  // ( or smaller than MIN_SAFE_INTEGER ) the parseIntNoBigCheck result might be
  // different from what you would get from Number(inputNumberAsString)
  // String(parseIntNoBigCheck) <> String(Number(inputNumberAsString)) <> inputNumberAsString
  parseIntNoBigCheck(len) {
    if (len === null) {
      return null;
    }
    let result = 0;
    const end = this.offset + len;
    let sign = 1;
    if (len === 0) {
      return 0; // TODO: assert? exception?
    }
    if (this.buffer[this.offset] === minus) {
      this.offset++;
      sign = -1;
    }
    if (this.buffer[this.offset] === plus) {
      this.offset++; // just ignore
    }
    while (this.offset < end) {
      result *= 10;
      result += this.buffer[this.offset] - 48;
      this.offset++;
    }
    return result * sign;
  }

  // adapted from https://github.com/mysqljs/mysql/blob/dc9c152a87ec51a1f647447268917243d2eab1fd/lib/protocol/Parser.js
  parseGeometryValue() {
    const buffer = this.readLengthCodedBuffer();
    let offset = 4;
    if (buffer === null || !buffer.length) {
      return null;
    }
    const bufferLength = buffer.length;
    function parseGeometry() {
      let x, y, i, j, numPoints, numRings, num, line;
      let result = null;
      if (offset + 5 > bufferLength) {
        return null;
      }
      const byteOrder = buffer.readUInt8(offset);
      offset += 1;
      const wkbType = byteOrder
        ? buffer.readUInt32LE(offset)
        : buffer.readUInt32BE(offset);
      offset += 4;
      switch (wkbType) {
        case 1: // WKBPoint
          if (offset + 16 > bufferLength) {
            return null;
          }
          x = byteOrder
            ? buffer.readDoubleLE(offset)
            : buffer.readDoubleBE(offset);
          offset += 8;
          y = byteOrder
            ? buffer.readDoubleLE(offset)
            : buffer.readDoubleBE(offset);
          offset += 8;
          result = { x: x, y: y };
          break;
        case 2: // WKBLineString
          if (offset + 4 > bufferLength) {
            return null;
          }
          numPoints = byteOrder
            ? buffer.readUInt32LE(offset)
            : buffer.readUInt32BE(offset);
          offset += 4;
          if (numPoints > (bufferLength - offset) / 16) {
            return null;
          }
          result = [];
          for (i = numPoints; i > 0; i--) {
            if (offset + 16 > bufferLength) {
              break;
            }
            x = byteOrder
              ? buffer.readDoubleLE(offset)
              : buffer.readDoubleBE(offset);
            offset += 8;
            y = byteOrder
              ? buffer.readDoubleLE(offset)
              : buffer.readDoubleBE(offset);
            offset += 8;
            result.push({ x: x, y: y });
          }
          break;
        case 3: // WKBPolygon
          if (offset + 4 > bufferLength) {
            return null;
          }
          numRings = byteOrder
            ? buffer.readUInt32LE(offset)
            : buffer.readUInt32BE(offset);
          offset += 4;
          if (numRings > (bufferLength - offset) / 4) {
            return null;
          }
          result = [];
          for (i = numRings; i > 0; i--) {
            if (offset + 4 > bufferLength) {
              break;
            }
            numPoints = byteOrder
              ? buffer.readUInt32LE(offset)
              : buffer.readUInt32BE(offset);
            offset += 4;
            line = [];
            for (j = numPoints; j > 0; j--) {
              if (offset + 16 > bufferLength) {
                break;
              }
              x = byteOrder
                ? buffer.readDoubleLE(offset)
                : buffer.readDoubleBE(offset);
              offset += 8;
              y = byteOrder
                ? buffer.readDoubleLE(offset)
                : buffer.readDoubleBE(offset);
              offset += 8;
              line.push({ x: x, y: y });
            }
            result.push(line);
          }
          break;
        case 4: // WKBMultiPoint
        case 5: // WKBMultiLineString
        case 6: // WKBMultiPolygon
        case 7: // WKBGeometryCollection
          if (offset + 4 > bufferLength) {
            return null;
          }
          num = byteOrder
            ? buffer.readUInt32LE(offset)
            : buffer.readUInt32BE(offset);
          offset += 4;
          if (num > (bufferLength - offset) / 9) {
            return null;
          }
          result = [];
          for (i = num; i > 0; i--) {
            result.push(parseGeometry());
          }
          break;
      }
      return result;
    }
    return parseGeometry();
  }

  parseVector() {
    const bufLen = this.readLengthCodedNumber();
    const vectorEnd = this.offset + bufLen;
    const result = [];
    while (this.offset < vectorEnd && this.offset < this.end) {
      result.push(this.readFloat());
    }
    return result;
  }

  parseDate(timezone) {
    const strLen = this.readLengthCodedNumber();
    if (strLen === null) {
      return null;
    }
    if (strLen !== 10) {
      // we expect only YYYY-MM-DD here.
      // if for some reason it's not the case return invalid date
      return new Date(NaN);
    }
    const y = this.parseInt(4);
    this.offset++; // -
    const m = this.parseInt(2);
    this.offset++; // -
    const d = this.parseInt(2);
    if (!timezone || timezone === 'local') {
      return new Date(y, m - 1, d);
    }
    if (timezone === 'Z') {
      return new Date(Date.UTC(y, m - 1, d));
    }
    return new Date(
      `${leftPad(4, y)}-${leftPad(2, m)}-${leftPad(2, d)}T00:00:00${timezone}`
    );
  }

  parseDateTime(timezone) {
    const str = this.readLengthCodedString('binary');
    if (str === null) {
      return null;
    }
    if (!timezone || timezone === 'local') {
      return new Date(str);
    }
    return new Date(`${str}${timezone}`);
  }

  parseFloat(len) {
    if (len === null) {
      return null;
    }
    if (len === 0) {
      return 0; // TODO: assert? exception?
    }

    // For numbers with many digits (>17), use built-in parseFloat to avoid
    // precision loss from accumulated rounding errors in repeated *10 operations.
    // This fixes issues #2928 (MAX_VALUE doubles) and #3690 (DECIMAL(36,18))
    // where very large numbers or numbers with many fractional digits lose precision.
    // The threshold of 17 is based on IEEE 754 double precision (~15-17 significant digits).
    // Testing shows minimal performance impact as most real-world numbers are shorter.
    if (len > 17) {
      const str = this.buffer.toString('utf8', this.offset, this.offset + len);
      this.offset += len;
      return Number.parseFloat(str);
    }

    let result = 0;
    const end = this.offset + len;
    let factor = 1;
    let pastDot = false;
    let charCode = 0;
    if (this.buffer[this.offset] === minus) {
      this.offset++;
      factor = -1;
    }
    if (this.buffer[this.offset] === plus) {
      this.offset++; // just ignore
    }
    while (this.offset < end) {
      charCode = this.buffer[this.offset];
      if (charCode === dot) {
        pastDot = true;
        this.offset++;
      } else if (charCode === exponent || charCode === exponentCapital) {
        // Scientific notation detected - bail out to parseFloat for exact match.
        // Manual calculation with Math.pow(10, exp) cannot match parseFloat()
        // exactly for most non-zero exponents due to accumulated rounding errors.
        const start = end - len;
        const str = this.buffer.toString('utf8', start, end);
        this.offset = end;
        return Number.parseFloat(str);
      } else {
        result *= 10;
        result += this.buffer[this.offset] - 48;
        this.offset++;
        if (pastDot) {
          factor = factor * 10;
        }
      }
    }
    return result / factor;
  }

  parseLengthCodedIntNoBigCheck() {
    return this.parseIntNoBigCheck(this.readLengthCodedNumber());
  }

  parseLengthCodedInt(supportBigNumbers) {
    return this.parseInt(this.readLengthCodedNumber(), supportBigNumbers);
  }

  parseLengthCodedIntString() {
    return this.readLengthCodedString('binary');
  }

  parseLengthCodedFloat() {
    return this.parseFloat(this.readLengthCodedNumber());
  }

  peekByte() {
    return this.buffer[this.offset];
  }

  // OxFE is often used as "Alt" flag - not ok, not error.
  // For example, it's first byte of AuthSwitchRequest
  isAlt() {
    return this.peekByte() === 0xfe;
  }

  isError() {
    return this.peekByte() === 0xff;
  }

  asError(encoding) {
    this.reset();
    this.readInt8(); // fieldCount
    const errorCode = this.readInt16();
    let sqlState = '';
    if (this.buffer[this.offset] === 0x23) {
      this.skip(1);
      sqlState = this.readBuffer(5).toString();
    }
    const message = this.readString(undefined, encoding);
    const err = new Error(message);
    err.code = ErrorCodeToName[errorCode];
    err.errno = errorCode;
    err.sqlState = sqlState;
    err.sqlMessage = message;
    return err;
  }

  writeInt32(n) {
    this.buffer.writeUInt32LE(n, this.offset);
    this.offset += 4;
  }

  writeInt24(n) {
    this.writeInt8(n & 0xff);
    this.writeInt16(n >> 8);
  }

  writeInt16(n) {
    this.buffer.writeUInt16LE(n, this.offset);
    this.offset += 2;
  }

  writeInt8(n) {
    this.buffer.writeUInt8(n, this.offset);
    this.offset++;
  }

  writeDouble(n) {
    this.buffer.writeDoubleLE(n, this.offset);
    this.offset += 8;
  }

  writeBuffer(b) {
    b.copy(this.buffer, this.offset);
    this.offset += b.length;
  }

  writeNull() {
    this.buffer[this.offset] = 0xfb;
    this.offset++;
  }

  // TODO: refactor following three?
  writeNullTerminatedString(s, encoding) {
    const buf = StringParser$3.encode(s, encoding);
    this.buffer.length && buf.copy(this.buffer, this.offset);
    this.offset += buf.length;
    this.writeInt8(0);
  }

  writeString(s, encoding) {
    if (s === null) {
      this.writeInt8(0xfb);
      return;
    }
    if (s.length === 0) {
      return;
    }
    // const bytes = Buffer.byteLength(s, 'utf8');
    // this.buffer.write(s, this.offset, bytes, 'utf8');
    // this.offset += bytes;
    const buf = StringParser$3.encode(s, encoding);
    this.buffer.length && buf.copy(this.buffer, this.offset);
    this.offset += buf.length;
  }

  writeLengthCodedString(s, encoding) {
    const buf = StringParser$3.encode(s, encoding);
    this.writeLengthCodedNumber(buf.length);
    this.buffer.length && buf.copy(this.buffer, this.offset);
    this.offset += buf.length;
  }

  writeLengthCodedBuffer(b) {
    this.writeLengthCodedNumber(b.length);
    b.copy(this.buffer, this.offset);
    this.offset += b.length;
  }

  writeLengthCodedNumber(n) {
    if (n < 0xfb) {
      return this.writeInt8(n);
    }
    if (n < 0xffff) {
      this.writeInt8(0xfc);
      return this.writeInt16(n);
    }
    if (n < 0xffffff) {
      this.writeInt8(0xfd);
      return this.writeInt24(n);
    }
    if (n === null) {
      return this.writeInt8(0xfb);
    }
    this.writeInt8(0xfe);
    this.buffer.writeUInt32LE(n >>> 0, this.offset);
    this.offset += 4;
    this.buffer.writeUInt32LE(Math.floor(n / 0x100000000), this.offset);
    this.offset += 4;
    return this.offset;
  }

  writeDate(d, timezone) {
    this.buffer.writeUInt8(11, this.offset);
    if (!timezone || timezone === 'local') {
      this.buffer.writeUInt16LE(d.getFullYear(), this.offset + 1);
      this.buffer.writeUInt8(d.getMonth() + 1, this.offset + 3);
      this.buffer.writeUInt8(d.getDate(), this.offset + 4);
      this.buffer.writeUInt8(d.getHours(), this.offset + 5);
      this.buffer.writeUInt8(d.getMinutes(), this.offset + 6);
      this.buffer.writeUInt8(d.getSeconds(), this.offset + 7);
      this.buffer.writeUInt32LE(d.getMilliseconds() * 1000, this.offset + 8);
    } else {
      if (timezone !== 'Z') {
        const offset =
          (timezone[0] === '-' ? -1 : 1) *
          (parseInt(timezone.substring(1, 3), 10) * 60 +
            parseInt(timezone.substring(4), 10));
        if (offset !== 0) {
          d = new Date(d.getTime() + 60000 * offset);
        }
      }
      this.buffer.writeUInt16LE(d.getUTCFullYear(), this.offset + 1);
      this.buffer.writeUInt8(d.getUTCMonth() + 1, this.offset + 3);
      this.buffer.writeUInt8(d.getUTCDate(), this.offset + 4);
      this.buffer.writeUInt8(d.getUTCHours(), this.offset + 5);
      this.buffer.writeUInt8(d.getUTCMinutes(), this.offset + 6);
      this.buffer.writeUInt8(d.getUTCSeconds(), this.offset + 7);
      this.buffer.writeUInt32LE(d.getUTCMilliseconds() * 1000, this.offset + 8);
    }
    this.offset += 12;
  }

  writeHeader(sequenceId) {
    const offset = this.offset;
    this.offset = 0;
    this.writeInt24(this.buffer.length - 4);
    this.writeInt8(sequenceId);
    this.offset = offset;
  }

  clone() {
    return new Packet(this.sequenceId, this.buffer, this.start, this.end);
  }

  type() {
    if (this.isEOF()) {
      return 'EOF';
    }
    if (this.isError()) {
      return 'Error';
    }
    if (this.buffer[this.offset] === 0) {
      return 'maybeOK'; // could be other packet types as well
    }
    return '';
  }

  static lengthCodedNumberLength(n) {
    if (n < 0xfb) {
      return 1;
    }
    if (n < 0xffff) {
      return 3;
    }
    if (n < 0xffffff) {
      return 5;
    }
    return 9;
  }

  static lengthCodedStringLength(str, encoding) {
    const buf = StringParser$3.encode(str, encoding);
    const slen = buf.length;
    return Packet.lengthCodedNumberLength(slen) + slen;
  }

  static MockBuffer() {
    const noop = function () {};
    const res = Buffer.alloc(0);
    for (const op in NativeBuffer.prototype) {
      if (typeof res[op] === 'function') {
        res[op] = noop;
      }
    }
    return res;
  }
};

var packet = Packet$n;

const Packet$m = packet;

const MAX_PACKET_LENGTH = 16777215;

function readPacketLength(b, off) {
  const b0 = b[off];
  const b1 = b[off + 1];
  const b2 = b[off + 2];
  if (b1 + b2 === 0) {
    return b0;
  }
  return b0 + (b1 << 8) + (b2 << 16);
}

let PacketParser$1 = class PacketParser {
  constructor(onPacket, packetHeaderLength) {
    // 4 for normal packets, 7 for comprssed protocol packets
    if (typeof packetHeaderLength === 'undefined') {
      packetHeaderLength = 4;
    }
    // array of last payload chunks
    // only used when current payload is not complete
    this.buffer = [];
    // total length of chunks on buffer
    this.bufferLength = 0;
    this.packetHeaderLength = packetHeaderLength;
    // incomplete header state: number of header bytes received
    this.headerLen = 0;
    // expected payload length
    this.length = 0;
    this.largePacketParts = [];
    this.firstPacketSequenceId = 0;
    this.onPacket = onPacket;
    this.execute = PacketParser.prototype.executeStart;
    this._flushLargePacket =
      packetHeaderLength === 7
        ? this._flushLargePacket7
        : this._flushLargePacket4;
  }

  _flushLargePacket4() {
    const numPackets = this.largePacketParts.length;
    this.largePacketParts.unshift(Buffer.from([0, 0, 0, 0])); // insert header
    const body = Buffer.concat(this.largePacketParts);
    const packet = new Packet$m(this.firstPacketSequenceId, body, 0, body.length);
    this.largePacketParts.length = 0;
    packet.numPackets = numPackets;
    this.onPacket(packet);
  }

  _flushLargePacket7() {
    const numPackets = this.largePacketParts.length;
    this.largePacketParts.unshift(Buffer.from([0, 0, 0, 0, 0, 0, 0])); // insert header
    const body = Buffer.concat(this.largePacketParts);
    this.largePacketParts.length = 0;
    const packet = new Packet$m(this.firstPacketSequenceId, body, 0, body.length);
    packet.numPackets = numPackets;
    this.onPacket(packet);
  }

  executeStart(chunk) {
    let start = 0;
    const end = chunk.length;
    while (end - start >= 3) {
      this.length = readPacketLength(chunk, start);
      if (end - start >= this.length + this.packetHeaderLength) {
        // at least one full packet
        const sequenceId = chunk[start + 3];
        if (
          this.length < MAX_PACKET_LENGTH &&
          this.largePacketParts.length === 0
        ) {
          this.onPacket(
            new Packet$m(
              sequenceId,
              chunk,
              start,
              start + this.packetHeaderLength + this.length
            )
          );
        } else {
          // first large packet - remember it's id
          if (this.largePacketParts.length === 0) {
            this.firstPacketSequenceId = sequenceId;
          }
          this.largePacketParts.push(
            chunk.slice(
              start + this.packetHeaderLength,
              start + this.packetHeaderLength + this.length
            )
          );
          if (this.length < MAX_PACKET_LENGTH) {
            this._flushLargePacket();
          }
        }
        start += this.packetHeaderLength + this.length;
      } else {
        // payload is incomplete
        this.buffer = [chunk.slice(start + 3, end)];
        this.bufferLength = end - start - 3;
        this.execute = PacketParser.prototype.executePayload;
        return;
      }
    }
    if (end - start > 0) {
      // there is start of length header, but it's not full 3 bytes
      this.headerLen = end - start; // 1 or 2 bytes
      this.length = chunk[start];
      if (this.headerLen === 2) {
        this.length = chunk[start] + (chunk[start + 1] << 8);
        this.execute = PacketParser.prototype.executeHeader3;
      } else {
        this.execute = PacketParser.prototype.executeHeader2;
      }
    }
  }

  executePayload(chunk) {
    let start = 0;
    const end = chunk.length;
    const remainingPayload =
      this.length - this.bufferLength + this.packetHeaderLength - 3;
    if (end - start >= remainingPayload) {
      // last chunk for payload
      const payload = Buffer.allocUnsafe(this.length + this.packetHeaderLength);
      let offset = 3;
      for (let i = 0; i < this.buffer.length; ++i) {
        this.buffer[i].copy(payload, offset);
        offset += this.buffer[i].length;
      }
      chunk.copy(payload, offset, start, start + remainingPayload);
      const sequenceId = payload[3];
      if (
        this.length < MAX_PACKET_LENGTH &&
        this.largePacketParts.length === 0
      ) {
        this.onPacket(
          new Packet$m(
            sequenceId,
            payload,
            0,
            this.length + this.packetHeaderLength
          )
        );
      } else {
        // first large packet - remember it's id
        if (this.largePacketParts.length === 0) {
          this.firstPacketSequenceId = sequenceId;
        }
        this.largePacketParts.push(
          payload.slice(
            this.packetHeaderLength,
            this.packetHeaderLength + this.length
          )
        );
        if (this.length < MAX_PACKET_LENGTH) {
          this._flushLargePacket();
        }
      }
      this.buffer = [];
      this.bufferLength = 0;
      this.execute = PacketParser.prototype.executeStart;
      start += remainingPayload;
      if (end - start > 0) {
        return this.execute(chunk.slice(start, end));
      }
    } else {
      this.buffer.push(chunk);
      this.bufferLength += chunk.length;
    }
    return null;
  }

  executeHeader2(chunk) {
    this.length += chunk[0] << 8;
    if (chunk.length > 1) {
      this.length += chunk[1] << 16;
      this.execute = PacketParser.prototype.executePayload;
      return this.executePayload(chunk.slice(2));
    }
    this.execute = PacketParser.prototype.executeHeader3;

    return null;
  }

  executeHeader3(chunk) {
    this.length += chunk[0] << 16;
    this.execute = PacketParser.prototype.executePayload;
    return this.executePayload(chunk.slice(1));
  }
};

var packet_parser = PacketParser$1;

var packets = {exports: {}};

const Packet$l = packet;

class AuthNextFactor {
  constructor(opts) {
    this.pluginName = opts.pluginName;
    this.pluginData = opts.pluginData;
  }

  toPacket(encoding) {
    const length = 6 + this.pluginName.length + this.pluginData.length;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$l(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(0x02);
    packet.writeNullTerminatedString(this.pluginName, encoding);
    packet.writeBuffer(this.pluginData);
    return packet;
  }

  static fromPacket(packet, encoding) {
    packet.readInt8(); // marker
    const name = packet.readNullTerminatedString(encoding);
    const data = packet.readBuffer();
    return new AuthNextFactor({
      pluginName: name,
      pluginData: data,
    });
  }
}

var auth_next_factor = AuthNextFactor;

// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::AuthSwitchRequest

const Packet$k = packet;

class AuthSwitchRequest {
  constructor(opts) {
    this.pluginName = opts.pluginName;
    this.pluginData = opts.pluginData;
  }

  toPacket() {
    const length = 6 + this.pluginName.length + this.pluginData.length;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$k(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(0xfe);
    // TODO: use server encoding
    packet.writeNullTerminatedString(this.pluginName, 'cesu8');
    packet.writeBuffer(this.pluginData);
    return packet;
  }

  static fromPacket(packet) {
    packet.readInt8(); // marker
    // assert marker == 0xfe?
    // TODO: use server encoding
    const name = packet.readNullTerminatedString('cesu8');
    const data = packet.readBuffer();
    return new AuthSwitchRequest({
      pluginName: name,
      pluginData: data,
    });
  }
}

var auth_switch_request = AuthSwitchRequest;

// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::AuthSwitchRequest

const Packet$j = packet;

class AuthSwitchRequestMoreData {
  constructor(data) {
    this.data = data;
  }

  toPacket() {
    const length = 5 + this.data.length;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$j(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(0x01);
    packet.writeBuffer(this.data);
    return packet;
  }

  static fromPacket(packet) {
    packet.readInt8(); // marker
    const data = packet.readBuffer();
    return new AuthSwitchRequestMoreData(data);
  }

  static verifyMarker(packet) {
    return packet.peekByte() === 0x01;
  }
}

var auth_switch_request_more_data = AuthSwitchRequestMoreData;

// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::AuthSwitchRequest

const Packet$i = packet;

class AuthSwitchResponse {
  constructor(data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }
    this.data = data;
  }

  toPacket() {
    const length = 4 + this.data.length;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$i(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeBuffer(this.data);
    return packet;
  }

  static fromPacket(packet) {
    const data = packet.readBuffer();
    return new AuthSwitchResponse(data);
  }
}

var auth_switch_response = AuthSwitchResponse;

const Types$7 = /*@__PURE__*/ requireTypes();
const Packet$h = packet;

const binaryReader = new Array(256);

class BinaryRow {
  constructor(columns) {
    this.columns = columns || [];
  }

  static toPacket(columns, encoding) {
    // throw new Error('Not implemented');
    const sequenceId = 0; // TODO remove, this is calculated now in connecton
    let length = 0;
    columns.forEach((val) => {
      if (val === null || typeof val === 'undefined') {
        ++length;
        return;
      }
      length += Packet$h.lengthCodedStringLength(val.toString(10), encoding);
    });

    length = length + 2;

    const buffer = Buffer.allocUnsafe(length + 4);
    const packet = new Packet$h(sequenceId, buffer, 0, length + 4);
    packet.offset = 4;

    packet.writeInt8(0);

    let bitmap = 0;
    let bitValue = 1;
    columns.forEach((parameter) => {
      if (parameter.type === Types$7.NULL) {
        bitmap += bitValue;
      }
      bitValue *= 2;
      if (bitValue === 256) {
        packet.writeInt8(bitmap);
        bitmap = 0;
        bitValue = 1;
      }
    });
    if (bitValue !== 1) {
      packet.writeInt8(bitmap);
    }

    columns.forEach((val) => {
      if (val === null) {
        packet.writeNull();
        return;
      }
      if (typeof val === 'undefined') {
        packet.writeInt8(0);
        return;
      }
      packet.writeLengthCodedString(val.toString(10), encoding);
    });
    return packet;
  }

  // TODO: complete list of types...
  static fromPacket(fields, packet) {
    const columns = new Array(fields.length);
    packet.readInt8(); // TODO check it's 0
    const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);
    // TODO: read and interpret null bitmap
    packet.skip(nullBitmapLength);
    for (let i = 0; i < columns.length; ++i) {
      columns[i] = binaryReader[fields[i].columnType].apply(packet);
    }
    return new BinaryRow(columns);
  }
}

// TODO: replace with constants.MYSQL_TYPE_*
binaryReader[Types$7.DECIMAL] = Packet$h.prototype.readLengthCodedString;
binaryReader[1] = Packet$h.prototype.readInt8; // tiny
binaryReader[2] = Packet$h.prototype.readInt16; // short
binaryReader[3] = Packet$h.prototype.readInt32; // long
binaryReader[4] = Packet$h.prototype.readFloat; // float
binaryReader[5] = Packet$h.prototype.readDouble; // double
binaryReader[6] = Packet$h.prototype.assertInvalid; // null, should be skipped vie null bitmap
binaryReader[7] = Packet$h.prototype.readTimestamp; // timestamp, http://dev.mysql.com/doc/internals/en/prepared-statements.html#packet-ProtocolBinary::MYSQL_TYPE_TIMESTAMP
binaryReader[8] = Packet$h.prototype.readInt64; // long long
binaryReader[9] = Packet$h.prototype.readInt32; // int24
binaryReader[10] = Packet$h.prototype.readTimestamp; // date
binaryReader[11] = Packet$h.prototype.readTime; // time, http://dev.mysql.com/doc/internals/en/prepared-statements.html#packet-ProtocolBinary::MYSQL_TYPE_TIME
binaryReader[12] = Packet$h.prototype.readDateTime; // datetime, http://dev.mysql.com/doc/internals/en/prepared-statements.html#packet-ProtocolBinary::MYSQL_TYPE_DATETIME
binaryReader[13] = Packet$h.prototype.readInt16; // year
binaryReader[Types$7.VAR_STRING] = Packet$h.prototype.readLengthCodedString; // var string

var binary_row = BinaryRow;

var commands$1 = {
  QUIT: 0x01,
  INIT_DB: 0x02,
  QUERY: 0x03,
  FIELD_LIST: 0x04,
  PING: 0x0e,
  CHANGE_USER: 0x11,
  BINLOG_DUMP: 0x12,
  REGISTER_SLAVE: 0x15,
  STMT_PREPARE: 0x16,
  STMT_EXECUTE: 0x17,
  STMT_CLOSE: 0x19,
  RESET_CONNECTION: 0x1f};

// http://dev.mysql.com/doc/internals/en/com-binlog-dump.html#packet-COM_BINLOG_DUMP

const Packet$g = packet;
const CommandCodes$5 = commands$1;

// TODO: add flag to constants
// 0x01 - BINLOG_DUMP_NON_BLOCK
// send EOF instead of blocking
let BinlogDump$2 = class BinlogDump {
  constructor(opts) {
    this.binlogPos = opts.binlogPos || 0;
    this.serverId = opts.serverId || 0;
    this.flags = opts.flags || 0;
    this.filename = opts.filename || '';
  }

  toPacket() {
    const length = 15 + Buffer.byteLength(this.filename, 'utf8'); // TODO: should be ascii?
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$g(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(CommandCodes$5.BINLOG_DUMP);
    packet.writeInt32(this.binlogPos);
    packet.writeInt16(this.flags);
    packet.writeInt32(this.serverId);
    packet.writeString(this.filename);
    return packet;
  }
};

var binlog_dump$1 = BinlogDump$2;

var client = {};

// Manually extracted from mysql-5.5.23/include/mysql_com.h
client.LONG_PASSWORD = 0x00000001; /* new more secure passwords */
client.FOUND_ROWS = 0x00000002; /* found instead of affected rows */
client.LONG_FLAG = 0x00000004; /* get all column flags */
client.CONNECT_WITH_DB = 0x00000008; /* one can specify db on connect */
client.NO_SCHEMA = 0x00000010; /* don't allow database.table.column */
client.COMPRESS = 0x00000020; /* can use compression protocol */
client.ODBC = 0x00000040; /* odbc client */
client.LOCAL_FILES = 0x00000080; /* can use LOAD DATA LOCAL */
client.IGNORE_SPACE = 0x00000100; /* ignore spaces before '' */
client.PROTOCOL_41 = 0x00000200; /* new 4.1 protocol */
client.INTERACTIVE = 0x00000400; /* this is an interactive client */
client.SSL = 0x00000800; /* switch to ssl after handshake */
client.IGNORE_SIGPIPE = 0x00001000; /* IGNORE sigpipes */
client.TRANSACTIONS = 0x00002000; /* client knows about transactions */
client.RESERVED = 0x00004000; /* old flag for 4.1 protocol  */
client.SECURE_CONNECTION = 0x00008000; /* new 4.1 authentication */
client.MULTI_STATEMENTS = 0x00010000; /* enable/disable multi-stmt support */
client.MULTI_RESULTS = 0x00020000; /* enable/disable multi-results */
client.PS_MULTI_RESULTS = 0x00040000; /* multi-results in ps-protocol */
client.PLUGIN_AUTH = 0x00080000; /* client supports plugin authentication */
client.CONNECT_ATTRS = 0x00100000; /* permits connection attributes */
client.PLUGIN_AUTH_LENENC_CLIENT_DATA = 0x00200000; /* Understands length-encoded integer for auth response data in Protocol::HandshakeResponse41. */
client.CAN_HANDLE_EXPIRED_PASSWORDS = 0x00400000; /* Announces support for expired password extension. */
client.SESSION_TRACK = 0x00800000; /* Can set SERVER_SESSION_STATE_CHANGED in the Status Flags and send session-state change data after a OK packet. */
client.CLIENT_QUERY_ATTRIBUTES = 0x08000000; /* support query attributes in COM_QUERY and COM_STMT_EXECUTE */

client.SSL_VERIFY_SERVER_CERT = 0x40000000;
client.REMEMBER_OPTIONS = 0x80000000;

client.MULTI_FACTOR_AUTHENTICATION = 0x10000000; /* multi-factor authentication */

var auth_41 = {};

const require$$0$3 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(crypto$3);

(function (exports) {

	/*
	4.1 authentication: (http://bazaar.launchpad.net/~mysql/mysql-server/5.5/view/head:/sql/password.c)

	  SERVER:  public_seed=create_random_string()
	           send(public_seed)

	  CLIENT:  recv(public_seed)
	           hash_stage1=sha1("password")
	           hash_stage2=sha1(hash_stage1)
	           reply=xor(hash_stage1, sha1(public_seed,hash_stage2)

	           // this three steps are done in scramble()

	           send(reply)


	  SERVER:  recv(reply)
	           hash_stage1=xor(reply, sha1(public_seed,hash_stage2))
	           candidate_hash2=sha1(hash_stage1)
	           check(candidate_hash2==hash_stage2)

	server stores sha1(sha1(password)) ( hash_stag2)
	*/

	const crypto = require$$0$3;

	function sha1(msg, msg1, msg2) {
	  const hash = crypto.createHash('sha1');
	  hash.update(msg);
	  if (msg1) {
	    hash.update(msg1);
	  }

	  if (msg2) {
	    hash.update(msg2);
	  }

	  return hash.digest();
	}

	function xor(a, b) {
	  const result = Buffer.allocUnsafe(a.length);
	  for (let i = 0; i < a.length; i++) {
	    result[i] = a[i] ^ b[i];
	  }
	  return result;
	}

	exports.xor = xor;

	function token(password, scramble1, scramble2) {
	  if (!password) {
	    return Buffer.alloc(0);
	  }
	  const stage1 = sha1(password);
	  return exports.calculateTokenFromPasswordSha(stage1, scramble1, scramble2);
	}

	exports.calculateTokenFromPasswordSha = function (
	  passwordSha,
	  scramble1,
	  scramble2
	) {
	  // we use AUTH 41 here, and we need only the bytes we just need.
	  const authPluginData1 = scramble1.slice(0, 8);
	  const authPluginData2 = scramble2.slice(0, 12);
	  const stage2 = sha1(passwordSha);
	  const stage3 = sha1(authPluginData1, authPluginData2, stage2);
	  return xor(stage3, passwordSha);
	};

	exports.calculateToken = token;

	exports.verifyToken = function (publicSeed1, publicSeed2, token, doubleSha) {
	  const hashStage1 = xor(token, sha1(publicSeed1, publicSeed2, doubleSha));
	  const candidateHash2 = sha1(hashStage1);
	  return candidateHash2.compare(doubleSha) === 0;
	};

	exports.doubleSha1 = function (password) {
	  return sha1(sha1(password));
	};

	function xorRotating(a, seed) {
	  const result = Buffer.allocUnsafe(a.length);
	  const seedLen = seed.length;

	  for (let i = 0; i < a.length; i++) {
	    result[i] = a[i] ^ seed[i % seedLen];
	  }
	  return result;
	}
	exports.xorRotating = xorRotating; 
} (auth_41));

var charset_encodings;
var hasRequiredCharset_encodings;

function requireCharset_encodings () {
	if (hasRequiredCharset_encodings) return charset_encodings;
	hasRequiredCharset_encodings = 1;

	// see tools/generate-charset-mapping.js
	// basicalliy result of "SHOW COLLATION" query

	charset_encodings = [
	  'utf8',
	  'big5',
	  'latin2',
	  'dec8',
	  'cp850',
	  'latin1',
	  'hp8',
	  'koi8r',
	  'latin1',
	  'latin2',
	  'swe7',
	  'ascii',
	  'eucjp',
	  'sjis',
	  'cp1251',
	  'latin1',
	  'hebrew',
	  'utf8',
	  'tis620',
	  'euckr',
	  'latin7',
	  'latin2',
	  'koi8u',
	  'cp1251',
	  'gb2312',
	  'greek',
	  'cp1250',
	  'latin2',
	  'gbk',
	  'cp1257',
	  'latin5',
	  'latin1',
	  'armscii8',
	  'cesu8',
	  'cp1250',
	  'ucs2',
	  'cp866',
	  'keybcs2',
	  'macintosh',
	  'macroman',
	  'cp852',
	  'latin7',
	  'latin7',
	  'macintosh',
	  'cp1250',
	  'utf8',
	  'utf8',
	  'latin1',
	  'latin1',
	  'latin1',
	  'cp1251',
	  'cp1251',
	  'cp1251',
	  'macroman',
	  'utf16',
	  'utf16',
	  'utf16-le',
	  'cp1256',
	  'cp1257',
	  'cp1257',
	  'utf32',
	  'utf32',
	  'utf16-le',
	  'binary',
	  'armscii8',
	  'ascii',
	  'cp1250',
	  'cp1256',
	  'cp866',
	  'dec8',
	  'greek',
	  'hebrew',
	  'hp8',
	  'keybcs2',
	  'koi8r',
	  'koi8u',
	  'cesu8',
	  'latin2',
	  'latin5',
	  'latin7',
	  'cp850',
	  'cp852',
	  'swe7',
	  'cesu8',
	  'big5',
	  'euckr',
	  'gb2312',
	  'gbk',
	  'sjis',
	  'tis620',
	  'ucs2',
	  'eucjp',
	  'geostd8',
	  'geostd8',
	  'latin1',
	  'cp932',
	  'cp932',
	  'eucjpms',
	  'eucjpms',
	  'cp1250',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf16',
	  'utf8',
	  'utf8',
	  'utf8',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'ucs2',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'ucs2',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf32',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'cesu8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'cesu8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'gb18030',
	  'gb18030',
	  'gb18030',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	  'utf8',
	];
	return charset_encodings;
}

const CommandCode$4 = commands$1;
const ClientConstants$9 = client;
const Packet$f = packet;
const auth41$3 = auth_41;
const CharsetToEncoding$8 = /*@__PURE__*/ requireCharset_encodings();

// https://dev.mysql.com/doc/internals/en/com-change-user.html#packet-COM_CHANGE_USER
let ChangeUser$2 = class ChangeUser {
  constructor(opts) {
    this.flags = opts.flags;
    this.user = opts.user || '';
    this.database = opts.database || '';
    this.password = opts.password || '';
    this.passwordSha1 = opts.passwordSha1;
    this.authPluginData1 = opts.authPluginData1;
    this.authPluginData2 = opts.authPluginData2;
    this.connectAttributes = opts.connectAttrinutes || {};
    let authToken;
    if (this.passwordSha1) {
      authToken = auth41$3.calculateTokenFromPasswordSha(
        this.passwordSha1,
        this.authPluginData1,
        this.authPluginData2
      );
    } else {
      authToken = auth41$3.calculateToken(
        this.password,
        this.authPluginData1,
        this.authPluginData2
      );
    }
    this.authToken = authToken;
    this.charsetNumber = opts.charsetNumber;
  }

  // TODO
  // ChangeUser.fromPacket = function(packet)
  // };
  serializeToBuffer(buffer) {
    const isSet = (flag) => this.flags & ClientConstants$9[flag];
    const packet = new Packet$f(0, buffer, 0, buffer.length);
    packet.offset = 4;
    const encoding = CharsetToEncoding$8[this.charsetNumber];
    packet.writeInt8(CommandCode$4.CHANGE_USER);
    packet.writeNullTerminatedString(this.user, encoding);
    if (isSet('SECURE_CONNECTION')) {
      packet.writeInt8(this.authToken.length);
      packet.writeBuffer(this.authToken);
    } else {
      packet.writeBuffer(this.authToken);
      packet.writeInt8(0);
    }
    packet.writeNullTerminatedString(this.database, encoding);
    packet.writeInt16(this.charsetNumber);
    if (isSet('PLUGIN_AUTH')) {
      // TODO: read this from parameters
      packet.writeNullTerminatedString('mysql_native_password', 'latin1');
    }
    if (isSet('CONNECT_ATTRS')) {
      const connectAttributes = this.connectAttributes;
      const attrNames = Object.keys(connectAttributes);
      let keysLength = 0;
      for (let k = 0; k < attrNames.length; ++k) {
        keysLength += Packet$f.lengthCodedStringLength(attrNames[k], encoding);
        keysLength += Packet$f.lengthCodedStringLength(
          connectAttributes[attrNames[k]],
          encoding
        );
      }
      packet.writeLengthCodedNumber(keysLength);
      for (let k = 0; k < attrNames.length; ++k) {
        packet.writeLengthCodedString(attrNames[k], encoding);
        packet.writeLengthCodedString(
          connectAttributes[attrNames[k]],
          encoding
        );
      }
    }
    return packet;
  }

  toPacket() {
    if (typeof this.user !== 'string') {
      throw new Error('"user" connection config property must be a string');
    }
    if (typeof this.database !== 'string') {
      throw new Error('"database" connection config property must be a string');
    }
    // dry run: calculate resulting packet length
    const p = this.serializeToBuffer(Packet$f.MockBuffer());
    return this.serializeToBuffer(Buffer.allocUnsafe(p.offset));
  }
};

var change_user$1 = ChangeUser$2;

const Packet$e = packet;
const CommandCodes$4 = commands$1;

let CloseStatement$2 = class CloseStatement {
  constructor(id) {
    this.id = id;
  }

  // note: no response sent back
  toPacket() {
    const packet = new Packet$e(0, Buffer.allocUnsafe(9), 0, 9);
    packet.offset = 4;
    packet.writeInt8(CommandCodes$4.STMT_CLOSE);
    packet.writeInt32(this.id);
    return packet;
  }
};

var close_statement$1 = CloseStatement$2;

var field_flags = {};

var hasRequiredField_flags;

function requireField_flags () {
	if (hasRequiredField_flags) return field_flags;
	hasRequiredField_flags = 1;

	// Manually extracted from mysql-5.5.23/include/mysql_com.h
	field_flags.NOT_NULL = 1; /* Field can't be NULL */
	field_flags.PRI_KEY = 2; /* Field is part of a primary key */
	field_flags.UNIQUE_KEY = 4; /* Field is part of a unique key */
	field_flags.MULTIPLE_KEY = 8; /* Field is part of a key */
	field_flags.BLOB = 16; /* Field is a blob */
	field_flags.UNSIGNED = 32; /* Field is unsigned */
	field_flags.ZEROFILL = 64; /* Field is zerofill */
	field_flags.BINARY = 128; /* Field is binary   */

	/* The following are only sent to new clients */
	field_flags.ENUM = 256; /* field is an enum */
	field_flags.AUTO_INCREMENT = 512; /* field is a autoincrement field */
	field_flags.TIMESTAMP = 1024; /* Field is a timestamp */
	field_flags.SET = 2048; /* field is a set */
	field_flags.NO_DEFAULT_VALUE = 4096; /* Field doesn't have default value */
	field_flags.ON_UPDATE_NOW = 8192; /* Field is set to NOW on UPDATE */
	field_flags.NUM = 32768; /* Field is num (for clients) */
	return field_flags;
}

const Packet$d = packet;
const StringParser$2 = string;
const CharsetToEncoding$7 = /*@__PURE__*/ requireCharset_encodings();

const fields = ['catalog', 'schema', 'table', 'orgTable', 'name', 'orgName'];

// creating JS string is relatively expensive (compared to
// reading few bytes from buffer) because all string properties
// except for name are unlikely to be used we postpone
// string conversion until property access
//
// TODO: watch for integration benchmarks (one with real network buffer)
// there could be bad side effect as keeping reference to a buffer makes it
// sit in the memory longer (usually until final .query() callback)
// Latest v8 perform much better in regard to bufferer -> string conversion,
// at some point of time this optimisation might become unnecessary
// see https://github.com/sidorares/node-mysql2/pull/137
//
class ColumnDefinition {
  constructor(packet, clientEncoding) {
    this._buf = packet.buffer;
    this._clientEncoding = clientEncoding;
    this._catalogLength = packet.readLengthCodedNumber();
    this._catalogStart = packet.offset;
    packet.offset += this._catalogLength;
    this._schemaLength = packet.readLengthCodedNumber();
    this._schemaStart = packet.offset;
    packet.offset += this._schemaLength;
    this._tableLength = packet.readLengthCodedNumber();
    this._tableStart = packet.offset;
    packet.offset += this._tableLength;
    this._orgTableLength = packet.readLengthCodedNumber();
    this._orgTableStart = packet.offset;
    packet.offset += this._orgTableLength;
    // name is always used, don't make it lazy
    const _nameLength = packet.readLengthCodedNumber();
    const _nameStart = packet.offset;
    packet.offset += _nameLength;
    this._orgNameLength = packet.readLengthCodedNumber();
    this._orgNameStart = packet.offset;
    packet.offset += this._orgNameLength;
    packet.skip(1); //  length of the following fields (always 0x0c)
    this.characterSet = packet.readInt16();
    this.encoding = CharsetToEncoding$7[this.characterSet];
    this.name = StringParser$2.decode(
      this._buf,
      this.encoding === 'binary' ? this._clientEncoding : this.encoding,
      _nameStart,
      _nameStart + _nameLength
    );
    this.columnLength = packet.readInt32();
    this.columnType = packet.readInt8();
    this.type = this.columnType;
    this.flags = packet.readInt16();
    this.decimals = packet.readInt8();
  }

  inspect() {
    return {
      catalog: this.catalog,
      schema: this.schema,
      name: this.name,
      orgName: this.orgName,
      table: this.table,
      orgTable: this.orgTable,
      characterSet: this.characterSet,
      encoding: this.encoding,
      columnLength: this.columnLength,
      type: this.columnType,
      flags: this.flags,
      decimals: this.decimals,
    };
  }

  [Symbol.for('nodejs.util.inspect.custom')](depth, inspectOptions, inspect) {
    const Types = /*@__PURE__*/ requireTypes();
    const typeNames = [];
    for (const t in Types) {
      typeNames[Types[t]] = t;
    }
    const fiedFlags = /*@__PURE__*/ requireField_flags();
    const flagNames = [];
    // TODO: respect inspectOptions.showHidden
    //const inspectFlags = inspectOptions.showHidden ? this.flags : this.flags & ~fiedFlags.PRI_KEY;
    const inspectFlags = this.flags;
    for (const f in fiedFlags) {
      if (inspectFlags & fiedFlags[f]) {
        if (f === 'PRI_KEY') {
          flagNames.push('PRIMARY KEY');
        } else if (f === 'NOT_NULL') {
          flagNames.push('NOT NULL');
        } else if (f === 'BINARY') ; else if (f === 'MULTIPLE_KEY') ; else if (f === 'NO_DEFAULT_VALUE') ; else if (f === 'BLOB') ; else if (f === 'UNSIGNED') ; else if (f === 'TIMESTAMP') ; else if (f === 'ON_UPDATE_NOW') {
          flagNames.push('ON UPDATE CURRENT_TIMESTAMP');
        } else {
          flagNames.push(f);
        }
      }
    }

    if (depth > 1) {
      return inspect({
        ...this.inspect(),
        typeName: typeNames[this.columnType],
        flags: flagNames,
      });
    }

    const isUnsigned = this.flags & fiedFlags.UNSIGNED;

    let typeName = typeNames[this.columnType];
    if (typeName === 'BLOB') {
      // TODO: check for non-utf8mb4 encoding
      if (this.columnLength === 4294967295) {
        typeName = 'LONGTEXT';
      } else if (this.columnLength === 67108860) {
        typeName = 'MEDIUMTEXT';
      } else if (this.columnLength === 262140) {
        typeName = 'TEXT';
      } else if (this.columnLength === 1020) {
        // 255*4
        typeName = 'TINYTEXT';
      } else {
        typeName = `BLOB(${this.columnLength})`;
      }
    } else if (typeName === 'VAR_STRING') {
      // TODO: check for non-utf8mb4 encoding
      typeName = `VARCHAR(${Math.ceil(this.columnLength / 4)})`;
    } else if (typeName === 'TINY') {
      if (
        (this.columnLength === 3 && isUnsigned) ||
        (this.columnLength === 4 && !isUnsigned)
      ) {
        typeName = 'TINYINT';
      } else {
        typeName = `TINYINT(${this.columnLength})`;
      }
    } else if (typeName === 'LONGLONG') {
      if (this.columnLength === 20) {
        typeName = 'BIGINT';
      } else {
        typeName = `BIGINT(${this.columnLength})`;
      }
    } else if (typeName === 'SHORT') {
      if (isUnsigned && this.columnLength === 5) {
        typeName = 'SMALLINT';
      } else if (!isUnsigned && this.columnLength === 6) {
        typeName = 'SMALLINT';
      } else {
        typeName = `SMALLINT(${this.columnLength})`;
      }
    } else if (typeName === 'LONG') {
      if (isUnsigned && this.columnLength === 10) {
        typeName = 'INT';
      } else if (!isUnsigned && this.columnLength === 11) {
        typeName = 'INT';
      } else {
        typeName = `INT(${this.columnLength})`;
      }
    } else if (typeName === 'INT24') {
      if (isUnsigned && this.columnLength === 8) {
        typeName = 'MEDIUMINT';
      } else if (!isUnsigned && this.columnLength === 9) {
        typeName = 'MEDIUMINT';
      } else {
        typeName = `MEDIUMINT(${this.columnLength})`;
      }
    } else if (typeName === 'DOUBLE') {
      // DOUBLE without modifiers is reported as DOUBLE(22, 31)
      if (this.columnLength === 22 && this.decimals === 31) {
        typeName = 'DOUBLE';
      } else {
        typeName = `DOUBLE(${this.columnLength},${this.decimals})`;
      }
    } else if (typeName === 'FLOAT') {
      // FLOAT without modifiers is reported as FLOAT(12, 31)
      if (this.columnLength === 12 && this.decimals === 31) {
        typeName = 'FLOAT';
      } else {
        typeName = `FLOAT(${this.columnLength},${this.decimals})`;
      }
    } else if (typeName === 'NEWDECIMAL') {
      if (this.columnLength === 11 && this.decimals === 0) {
        typeName = 'DECIMAL';
      } else if (this.decimals === 0) {
        // not sure why, but DECIMAL(13) is reported as DECIMAL(14, 0)
        // and DECIMAL(13, 9) is reported as NEWDECIMAL(15, 9)
        if (isUnsigned) {
          typeName = `DECIMAL(${this.columnLength})`;
        } else {
          typeName = `DECIMAL(${this.columnLength - 1})`;
        }
      } else {
        typeName = `DECIMAL(${this.columnLength - 2},${this.decimals})`;
      }
    } else {
      typeName = `${typeNames[this.columnType]}(${this.columnLength})`;
    }

    if (isUnsigned) {
      typeName += ' UNSIGNED';
    }

    // TODO respect colors option
    return `\`${this.name}\` ${[typeName, ...flagNames].join(' ')}`;
  }

  static toPacket(column, sequenceId) {
    let length = 17; // = 4 padding + 1 + 12 for the rest
    fields.forEach((field) => {
      length += Packet$d.lengthCodedStringLength(
        column[field],
        CharsetToEncoding$7[column.characterSet]
      );
    });
    const buffer = Buffer.allocUnsafe(length);

    const packet = new Packet$d(sequenceId, buffer, 0, length);
    function writeField(name) {
      packet.writeLengthCodedString(
        column[name],
        CharsetToEncoding$7[column.characterSet]
      );
    }
    packet.offset = 4;
    fields.forEach(writeField);
    packet.writeInt8(0x0c);
    packet.writeInt16(column.characterSet);
    packet.writeInt32(column.columnLength);
    packet.writeInt8(column.columnType);
    packet.writeInt16(column.flags);
    packet.writeInt8(column.decimals);
    packet.writeInt16(0); // filler
    return packet;
  }

  // node-mysql compatibility: alias "db" to "schema"
  get db() {
    return this.schema;
  }
}

const addString = function (name) {
  Object.defineProperty(ColumnDefinition.prototype, name, {
    get: function () {
      const start = this[`_${name}Start`];
      const end = start + this[`_${name}Length`];
      const val = StringParser$2.decode(
        this._buf,
        this.encoding === 'binary' ? this._clientEncoding : this.encoding,
        start,
        end
      );

      Object.defineProperty(this, name, {
        value: val,
        writable: false,
        configurable: false,
        enumerable: false,
      });

      return val;
    },
  });
};

addString('catalog');
addString('schema');
addString('table');
addString('orgTable');
addString('orgName');

var column_definition = ColumnDefinition;

var cursor = {
  NO_CURSOR: 0,
  PARAMETER_COUNT_AVAILABLE: 8,
};

const Types$6 = /*@__PURE__*/ requireTypes();
const Packet$c = packet;

function isJSON(value) {
  return (
    Array.isArray(value) ||
    value.constructor === Object ||
    (typeof value.toJSON === 'function' && !Buffer.isBuffer(value))
  );
}

function toParameter$2(value, encoding, timezone) {
  let type = Types$6.VAR_STRING;
  let length;
  let writer = function (value) {
    // eslint-disable-next-line no-invalid-this
    return Packet$c.prototype.writeLengthCodedString.call(this, value, encoding);
  };
  if (value !== null) {
    switch (typeof value) {
      case 'undefined':
        throw new TypeError('Bind parameters must not contain undefined');

      case 'number':
        type = Types$6.DOUBLE;
        length = 8;
        writer = Packet$c.prototype.writeDouble;
        break;

      case 'boolean':
        value = value | 0;
        type = Types$6.TINY;
        length = 1;
        writer = Packet$c.prototype.writeInt8;
        break;

      case 'object':
        if (Object.prototype.toString.call(value) === '[object Date]') {
          type = Types$6.DATETIME;
          length = 12;
          writer = function (value) {
            // eslint-disable-next-line no-invalid-this
            return Packet$c.prototype.writeDate.call(this, value, timezone);
          };
        } else if (isJSON(value)) {
          value = JSON.stringify(value);
          type = Types$6.JSON;
        } else if (Buffer.isBuffer(value)) {
          length = Packet$c.lengthCodedNumberLength(value.length) + value.length;
          writer = Packet$c.prototype.writeLengthCodedBuffer;
        }
        break;

      default:
        value = value.toString();
    }
  } else {
    value = '';
    type = Types$6.NULL;
  }
  if (!length) {
    length = Packet$c.lengthCodedStringLength(value, encoding);
  }
  return { value, type, length, writer };
}

var encode_parameter = { toParameter: toParameter$2};

const CursorType = cursor;
const CommandCodes$3 = commands$1;
const ClientConstants$8 = client;
const Types$5 = /*@__PURE__*/ requireTypes();
const Packet$b = packet;
const CharsetToEncoding$6 = /*@__PURE__*/ requireCharset_encodings();
const { toParameter: toParameter$1 } = encode_parameter;

let Execute$3 = class Execute {
  constructor(
    id,
    parameters,
    charsetNumber,
    timezone,
    attributes,
    clientFlags
  ) {
    this.id = id;
    this.parameters = parameters;
    this.encoding = CharsetToEncoding$6[charsetNumber];
    this.timezone = timezone;
    this.attributes = attributes;
    this.clientFlags = clientFlags || 0;
  }

  static fromPacket(packet, encoding) {
    const stmtId = packet.readInt32();
    const flags = packet.readInt8();
    const iterationCount = packet.readInt32();

    let i = packet.offset;
    while (i < packet.end - 1) {
      if (
        (packet.buffer[i + 1] === Types$5.VAR_STRING ||
          packet.buffer[i + 1] === Types$5.NULL ||
          packet.buffer[i + 1] === Types$5.DOUBLE ||
          packet.buffer[i + 1] === Types$5.TINY ||
          packet.buffer[i + 1] === Types$5.DATETIME ||
          packet.buffer[i + 1] === Types$5.JSON) &&
        packet.buffer[i] === 1 &&
        packet.buffer[i + 2] === 0
      ) {
        break;
      } else {
        packet.readInt8();
      }
      i++;
    }

    const types = [];

    for (let i = packet.offset + 1; i < packet.end - 1; i++) {
      if (
        (packet.buffer[i] === Types$5.VAR_STRING ||
          packet.buffer[i] === Types$5.NULL ||
          packet.buffer[i] === Types$5.DOUBLE ||
          packet.buffer[i] === Types$5.TINY ||
          packet.buffer[i] === Types$5.DATETIME ||
          packet.buffer[i] === Types$5.JSON) &&
        packet.buffer[i + 1] === 0
      ) {
        types.push(packet.buffer[i]);
        packet.skip(2);
      }
    }

    packet.skip(1);

    const values = [];
    for (let i = 0; i < types.length; i++) {
      if (types[i] === Types$5.VAR_STRING) {
        values.push(packet.readLengthCodedString(encoding));
      } else if (types[i] === Types$5.DOUBLE) {
        values.push(packet.readDouble());
      } else if (types[i] === Types$5.TINY) {
        values.push(packet.readInt8());
      } else if (types[i] === Types$5.DATETIME) {
        values.push(packet.readDateTime());
      } else if (types[i] === Types$5.JSON) {
        values.push(JSON.parse(packet.readLengthCodedString(encoding)));
      }
      if (types[i] === Types$5.NULL) {
        values.push(null);
      }
    }

    return { stmtId, flags, iterationCount, values };
  }

  _serializeToBuffer(buffer) {
    const useQueryAttributes =
      this.clientFlags & ClientConstants$8.CLIENT_QUERY_ATTRIBUTES;

    const attrNames =
      useQueryAttributes && this.attributes ? Object.keys(this.attributes) : [];
    const numParams = this.parameters ? this.parameters.length : 0;
    const numAttrs = attrNames.length;
    const totalParams = numParams + numAttrs;

    const packet = new Packet$b(0, buffer, 0, buffer.length);
    packet.offset = 4;
    packet.writeInt8(CommandCodes$3.STMT_EXECUTE);
    packet.writeInt32(this.id);

    let cursorFlags = CursorType.NO_CURSOR;
    if (useQueryAttributes) {
      cursorFlags |= CursorType.PARAMETER_COUNT_AVAILABLE;
    }
    packet.writeInt8(cursorFlags);
    packet.writeInt32(1); // iteration-count, always 1

    if (useQueryAttributes) {
      packet.writeLengthCodedNumber(totalParams);
    }

    if (totalParams > 0) {
      const bindParams =
        numParams > 0
          ? this.parameters.map((v) =>
              toParameter$1(v, this.encoding, this.timezone)
            )
          : [];
      const attrParams = attrNames.map((name) =>
        toParameter$1(this.attributes[name], this.encoding, this.timezone)
      );
      const allParams = bindParams.concat(attrParams);

      // null bitmap
      let bitmap = 0;
      let bitValue = 1;
      allParams.forEach((parameter) => {
        if (parameter.type === Types$5.NULL) {
          bitmap += bitValue;
        }
        bitValue *= 2;
        if (bitValue === 256) {
          packet.writeInt8(bitmap);
          bitmap = 0;
          bitValue = 1;
        }
      });
      if (bitValue !== 1) {
        packet.writeInt8(bitmap);
      }

      packet.writeInt8(1); // new-params-bound-flag

      // types (and names for attributes)
      for (let i = 0; i < allParams.length; i++) {
        packet.writeInt8(allParams[i].type);
        packet.writeInt8(0); // unsigned flag
        if (useQueryAttributes) {
          const name = i < numParams ? '' : attrNames[i - numParams];
          packet.writeLengthCodedString(name, this.encoding);
        }
      }

      // values
      allParams.forEach((parameter) => {
        if (parameter.type !== Types$5.NULL) {
          parameter.writer.call(packet, parameter.value);
        }
      });
    }

    return packet;
  }

  toPacket() {
    const p = this._serializeToBuffer(Packet$b.MockBuffer());
    return this._serializeToBuffer(Buffer.allocUnsafe(p.offset));
  }
};

var execute$1 = Execute$3;

const Packet$a = packet;
const ClientConstants$7 = client;

// https://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::Handshake

class Handshake {
  constructor(args) {
    this.protocolVersion = args.protocolVersion;
    this.serverVersion = args.serverVersion;
    this.capabilityFlags = args.capabilityFlags;
    this.connectionId = args.connectionId;
    this.authPluginData1 = args.authPluginData1;
    this.authPluginData2 = args.authPluginData2;
    this.characterSet = args.characterSet;
    this.statusFlags = args.statusFlags;
    this.authPluginName = args.authPluginName;
  }

  setScrambleData(cb) {
    require$$0$3.randomBytes(20, (err, data) => {
      if (err) {
        cb(err);
        return;
      }
      this.authPluginData1 = data.slice(0, 8);
      this.authPluginData2 = data.slice(8, 20);
      cb();
    });
  }

  toPacket(sequenceId) {
    const length = 68 + Buffer.byteLength(this.serverVersion, 'utf8');
    const buffer = Buffer.alloc(length + 4, 0); // zero fill, 10 bytes filler later needs to contain zeros
    const packet = new Packet$a(sequenceId, buffer, 0, length + 4);
    packet.offset = 4;
    packet.writeInt8(this.protocolVersion);
    packet.writeString(this.serverVersion, 'cesu8');
    packet.writeInt8(0);
    packet.writeInt32(this.connectionId);
    packet.writeBuffer(this.authPluginData1);
    packet.writeInt8(0);
    const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
    capabilityFlagsBuffer.writeUInt32LE(this.capabilityFlags, 0);
    packet.writeBuffer(capabilityFlagsBuffer.slice(0, 2));
    packet.writeInt8(this.characterSet);
    packet.writeInt16(this.statusFlags);
    packet.writeBuffer(capabilityFlagsBuffer.slice(2, 4));
    packet.writeInt8(21); // authPluginDataLength
    packet.skip(10);
    packet.writeBuffer(this.authPluginData2);
    packet.writeInt8(0);
    packet.writeString('mysql_native_password', 'latin1');
    packet.writeInt8(0);
    return packet;
  }

  static fromPacket(packet) {
    const args = {};
    args.protocolVersion = packet.readInt8();
    args.serverVersion = packet.readNullTerminatedString('cesu8');
    args.connectionId = packet.readInt32();
    args.authPluginData1 = packet.readBuffer(8);
    packet.skip(1);
    const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
    capabilityFlagsBuffer[0] = packet.readInt8();
    capabilityFlagsBuffer[1] = packet.readInt8();
    if (packet.haveMoreData()) {
      args.characterSet = packet.readInt8();
      args.statusFlags = packet.readInt16();
      // upper 2 bytes
      capabilityFlagsBuffer[2] = packet.readInt8();
      capabilityFlagsBuffer[3] = packet.readInt8();
      args.capabilityFlags = capabilityFlagsBuffer.readUInt32LE(0);
      if (args.capabilityFlags & ClientConstants$7.PLUGIN_AUTH) {
        args.authPluginDataLength = packet.readInt8();
      } else {
        args.authPluginDataLength = 0;
        packet.skip(1);
      }
      packet.skip(10);
    } else {
      args.capabilityFlags = capabilityFlagsBuffer.readUInt16LE(0);
    }

    const isSecureConnection =
      args.capabilityFlags & ClientConstants$7.SECURE_CONNECTION;
    if (isSecureConnection) {
      const authPluginDataLength = args.authPluginDataLength;
      if (authPluginDataLength === 0) {
        // for Secure Password Authentication
        args.authPluginDataLength = 20;
        args.authPluginData2 = packet.readBuffer(12);
        packet.skip(1);
      } else {
        // length > 0
        // for Custom Auth Plugin (PLUGIN_AUTH)
        const len = Math.max(13, authPluginDataLength - 8);
        args.authPluginData2 = packet.readBuffer(len);
      }
    }

    if (args.capabilityFlags & ClientConstants$7.PLUGIN_AUTH) {
      args.authPluginName = packet.readNullTerminatedString('ascii');
    }

    return new Handshake(args);
  }
}

var handshake = Handshake;

const ClientConstants$6 = client;
const CharsetToEncoding$5 = /*@__PURE__*/ requireCharset_encodings();
const Packet$9 = packet;

const auth41$2 = auth_41;

class HandshakeResponse {
  constructor(handshake) {
    this.user = handshake.user || '';
    this.database = handshake.database || '';
    this.password = handshake.password || '';
    this.passwordSha1 = handshake.passwordSha1;
    this.authPluginData1 = handshake.authPluginData1;
    this.authPluginData2 = handshake.authPluginData2;
    this.compress = handshake.compress;
    this.clientFlags = handshake.flags;

    // Accept pre-calculated authToken and authPluginName from caller
    // This allows the caller to optimize by using the server's preferred auth method
    if (
      handshake.authToken !== undefined &&
      handshake.authPluginName !== undefined
    ) {
      // Validate types to fail fast with clear errors
      if (!Buffer.isBuffer(handshake.authToken)) {
        throw new TypeError(
          'HandshakeResponse authToken must be a Buffer when provided'
        );
      }
      if (typeof handshake.authPluginName !== 'string') {
        throw new TypeError(
          'HandshakeResponse authPluginName must be a string when provided'
        );
      }
      this.authToken = handshake.authToken;
      this.authPluginName = handshake.authPluginName;
    } else {
      // Fallback to legacy behavior: calculate mysql_native_password token
      // TODO: pre-4.1 auth support
      let authToken;
      if (this.passwordSha1) {
        authToken = auth41$2.calculateTokenFromPasswordSha(
          this.passwordSha1,
          this.authPluginData1,
          this.authPluginData2
        );
      } else {
        authToken = auth41$2.calculateToken(
          this.password,
          this.authPluginData1,
          this.authPluginData2
        );
      }
      this.authToken = authToken;
      this.authPluginName = 'mysql_native_password';
    }

    this.charsetNumber = handshake.charsetNumber;
    this.encoding = CharsetToEncoding$5[handshake.charsetNumber];
    this.connectAttributes = handshake.connectAttributes;
  }

  serializeResponse(buffer) {
    const isSet = (flag) => this.clientFlags & ClientConstants$6[flag];
    const packet = new Packet$9(0, buffer, 0, buffer.length);
    packet.offset = 4;
    packet.writeInt32(this.clientFlags);
    packet.writeInt32(0); // max packet size. todo: move to config
    packet.writeInt8(this.charsetNumber);
    packet.skip(23);
    const encoding = this.encoding;
    packet.writeNullTerminatedString(this.user, encoding);
    let k;
    if (isSet('PLUGIN_AUTH_LENENC_CLIENT_DATA')) {
      packet.writeLengthCodedNumber(this.authToken.length);
      packet.writeBuffer(this.authToken);
    } else if (isSet('SECURE_CONNECTION')) {
      packet.writeInt8(this.authToken.length);
      packet.writeBuffer(this.authToken);
    } else {
      packet.writeBuffer(this.authToken);
      packet.writeInt8(0);
    }
    if (isSet('CONNECT_WITH_DB')) {
      packet.writeNullTerminatedString(this.database, encoding);
    }
    if (isSet('PLUGIN_AUTH')) {
      // Use the auth plugin name specified by the caller (optimized for server's preference)
      // or fall back to mysql_native_password for backward compatibility
      packet.writeNullTerminatedString(
        this.authPluginName || 'mysql_native_password',
        'latin1'
      );
    }
    if (isSet('CONNECT_ATTRS')) {
      const connectAttributes = this.connectAttributes || {};
      const attrNames = Object.keys(connectAttributes);
      let keysLength = 0;
      for (k = 0; k < attrNames.length; ++k) {
        keysLength += Packet$9.lengthCodedStringLength(attrNames[k], encoding);
        keysLength += Packet$9.lengthCodedStringLength(
          connectAttributes[attrNames[k]],
          encoding
        );
      }
      packet.writeLengthCodedNumber(keysLength);
      for (k = 0; k < attrNames.length; ++k) {
        packet.writeLengthCodedString(attrNames[k], encoding);
        packet.writeLengthCodedString(
          connectAttributes[attrNames[k]],
          encoding
        );
      }
    }
    return packet;
  }

  toPacket() {
    if (typeof this.user !== 'string') {
      throw new Error('"user" connection config property must be a string');
    }
    if (typeof this.database !== 'string') {
      throw new Error('"database" connection config property must be a string');
    }
    // dry run: calculate resulting packet length
    const p = this.serializeResponse(Packet$9.MockBuffer());
    return this.serializeResponse(Buffer.alloc(p.offset));
  }
  static fromPacket(packet, serverFlags = 0xffffffff) {
    const args = {};
    args.clientFlags = packet.readInt32();
    function isSet(flag) {
      return args.clientFlags & serverFlags & ClientConstants$6[flag];
    }
    args.maxPacketSize = packet.readInt32();
    args.charsetNumber = packet.readInt8();
    const encoding = CharsetToEncoding$5[args.charsetNumber];
    args.encoding = encoding;
    packet.skip(23);
    args.user = packet.readNullTerminatedString(encoding);
    let authTokenLength;
    if (isSet('PLUGIN_AUTH_LENENC_CLIENT_DATA')) {
      authTokenLength = packet.readLengthCodedNumber(encoding);
      args.authToken = packet.readBuffer(authTokenLength);
    } else if (isSet('SECURE_CONNECTION')) {
      authTokenLength = packet.readInt8();
      args.authToken = packet.readBuffer(authTokenLength);
    } else {
      args.authToken = packet.readNullTerminatedString(encoding);
    }
    if (isSet('CONNECT_WITH_DB')) {
      args.database = packet.readNullTerminatedString(encoding);
    }
    if (isSet('PLUGIN_AUTH')) {
      args.authPluginName = packet.readNullTerminatedString(encoding);
    }
    if (isSet('CONNECT_ATTRS')) {
      const keysLength = packet.readLengthCodedNumber(encoding);
      const keysEnd = packet.offset + keysLength;
      const attrs = {};
      while (packet.offset < keysEnd) {
        attrs[packet.readLengthCodedString(encoding)] =
          packet.readLengthCodedString(encoding);
      }
      args.connectAttributes = attrs;
    }
    return args;
  }
}

var handshake_response = HandshakeResponse;

const Packet$8 = packet;
const CommandCodes$2 = commands$1;
const StringParser$1 = string;
const CharsetToEncoding$4 = /*@__PURE__*/ requireCharset_encodings();

class PrepareStatement {
  constructor(sql, charsetNumber) {
    this.query = sql;
    this.charsetNumber = charsetNumber;
    this.encoding = CharsetToEncoding$4[charsetNumber];
  }

  toPacket() {
    const buf = StringParser$1.encode(this.query, this.encoding);
    const length = 5 + buf.length;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$8(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(CommandCodes$2.STMT_PREPARE);
    packet.writeBuffer(buf);
    return packet;
  }
}

var prepare_statement = PrepareStatement;

class PreparedStatementHeader {
  constructor(packet) {
    packet.skip(1); // should be 0
    this.id = packet.readInt32();
    this.fieldCount = packet.readInt16();
    this.parameterCount = packet.readInt16();
    packet.skip(1); // should be 0
    this.warningCount = packet.readInt16();
  }
}

// TODO: toPacket

var prepared_statement_header = PreparedStatementHeader;

const Packet$7 = packet;
const CommandCode$3 = commands$1;
const StringParser = string;
const CharsetToEncoding$3 = /*@__PURE__*/ requireCharset_encodings();
const ClientConstants$5 = client;
const Types$4 = /*@__PURE__*/ requireTypes();
const { toParameter } = encode_parameter;

let Query$3 = class Query {
  constructor(sql, charsetNumber, attributes, clientFlags) {
    this.query = sql;
    this.charsetNumber = charsetNumber;
    this.encoding = CharsetToEncoding$3[charsetNumber];
    this.attributes = attributes;
    this.clientFlags = clientFlags || 0;
  }

  serializeToBuffer(buffer) {
    const useQueryAttributes =
      this.clientFlags & ClientConstants$5.CLIENT_QUERY_ATTRIBUTES;
    const sqlBuf = StringParser.encode(this.query, this.encoding);
    const packet = new Packet$7(0, buffer, 0, buffer.length);
    packet.offset = 4;
    packet.writeInt8(CommandCode$3.QUERY);

    if (useQueryAttributes) {
      const attrs = this.attributes;
      const names = attrs ? Object.keys(attrs) : [];
      const paramCount = names.length;

      packet.writeLengthCodedNumber(paramCount);
      packet.writeLengthCodedNumber(1); // parameter_set_count, always 1

      if (paramCount > 0) {
        const parameters = names.map((name) =>
          toParameter(attrs[name], this.encoding, 'local')
        );

        // null bitmap
        let bitmap = 0;
        let bitValue = 1;
        parameters.forEach((parameter) => {
          if (parameter.type === Types$4.NULL) {
            bitmap += bitValue;
          }
          bitValue *= 2;
          if (bitValue === 256) {
            packet.writeInt8(bitmap);
            bitmap = 0;
            bitValue = 1;
          }
        });
        if (bitValue !== 1) {
          packet.writeInt8(bitmap);
        }

        packet.writeInt8(1); // new_params_bind_flag

        // types and names
        for (let i = 0; i < paramCount; i++) {
          packet.writeInt8(parameters[i].type);
          packet.writeInt8(0); // unsigned flag
          packet.writeLengthCodedString(names[i], this.encoding);
        }

        // values
        parameters.forEach((parameter) => {
          if (parameter.type !== Types$4.NULL) {
            parameter.writer.call(packet, parameter.value);
          }
        });
      }
    }

    packet.writeBuffer(sqlBuf);
    return packet;
  }

  toPacket() {
    const useQueryAttributes =
      this.clientFlags & ClientConstants$5.CLIENT_QUERY_ATTRIBUTES;

    if (!useQueryAttributes) {
      const buf = StringParser.encode(this.query, this.encoding);
      const length = 5 + buf.length;
      const buffer = Buffer.allocUnsafe(length);
      const packet = new Packet$7(0, buffer, 0, length);
      packet.offset = 4;
      packet.writeInt8(CommandCode$3.QUERY);
      packet.writeBuffer(buf);
      return packet;
    }

    // dry run to calculate required buffer length
    const p = this.serializeToBuffer(Packet$7.MockBuffer());
    return this.serializeToBuffer(Buffer.allocUnsafe(p.offset));
  }
};

var query$1 = Query$3;

// http://dev.mysql.com/doc/internals/en/com-register-slave.html
// note that documentation is incorrect, for example command code is actually 0x15 but documented as 0x14

const Packet$6 = packet;
const CommandCodes$1 = commands$1;

let RegisterSlave$2 = class RegisterSlave {
  constructor(opts) {
    this.serverId = opts.serverId || 0;
    this.slaveHostname = opts.slaveHostname || '';
    this.slaveUser = opts.slaveUser || '';
    this.slavePassword = opts.slavePassword || '';
    this.slavePort = opts.slavePort || 0;
    this.replicationRank = opts.replicationRank || 0;
    this.masterId = opts.masterId || 0;
  }

  toPacket() {
    const length =
      15 + // TODO: should be ascii?
      Buffer.byteLength(this.slaveHostname, 'utf8') +
      Buffer.byteLength(this.slaveUser, 'utf8') +
      Buffer.byteLength(this.slavePassword, 'utf8') +
      3 +
      4;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$6(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(CommandCodes$1.REGISTER_SLAVE);
    packet.writeInt32(this.serverId);
    packet.writeInt8(Buffer.byteLength(this.slaveHostname, 'utf8'));
    packet.writeString(this.slaveHostname);
    packet.writeInt8(Buffer.byteLength(this.slaveUser, 'utf8'));
    packet.writeString(this.slaveUser);
    packet.writeInt8(Buffer.byteLength(this.slavePassword, 'utf8'));
    packet.writeString(this.slavePassword);
    packet.writeInt16(this.slavePort);
    packet.writeInt32(this.replicationRank);
    packet.writeInt32(this.masterId);
    return packet;
  }
};

var register_slave$1 = RegisterSlave$2;

const Packet$5 = packet;
const CommandCodes = commands$1;

let ResetConnection$2 = class ResetConnection {
  constructor() {}

  toPacket() {
    const packet = new Packet$5(0, Buffer.alloc(5), 0, 5);
    packet.offset = 4;
    packet.writeInt8(CommandCodes.RESET_CONNECTION);
    return packet;
  }
};

var reset_connection$1 = ResetConnection$2;

var server_status = {};

// Manually extracted from mysql-5.5.23/include/mysql_com.h

/**
  Is raised when a multi-statement transaction
  has been started, either explicitly, by means
  of BEGIN or COMMIT AND CHAIN, or
  implicitly, by the first transactional
  statement, when autocommit=off.
*/
server_status.SERVER_STATUS_IN_TRANS = 1;
server_status.SERVER_STATUS_AUTOCOMMIT = 2; /* Server in auto_commit mode */
server_status.SERVER_MORE_RESULTS_EXISTS = 8; /* Multi query - next query exists */
server_status.SERVER_QUERY_NO_GOOD_INDEX_USED = 16;
server_status.SERVER_QUERY_NO_INDEX_USED = 32;
/**
  The server was able to fulfill the clients request and opened a
  read-only non-scrollable cursor for a query. This flag comes
  in reply to COM_STMT_EXECUTE and COM_STMT_FETCH commands.
*/
server_status.SERVER_STATUS_CURSOR_EXISTS = 64;
/**
  This flag is sent when a read-only cursor is exhausted, in reply to
  COM_STMT_FETCH command.
*/
server_status.SERVER_STATUS_LAST_ROW_SENT = 128;
server_status.SERVER_STATUS_DB_DROPPED = 256; /* A database was dropped */
server_status.SERVER_STATUS_NO_BACKSLASH_ESCAPES = 512;
/**
  Sent to the client if after a prepared statement reprepare
  we discovered that the new statement returns a different
  number of result set columns.
*/
server_status.SERVER_STATUS_METADATA_CHANGED = 1024;
server_status.SERVER_QUERY_WAS_SLOW = 2048;

/**
  To mark ResultSet containing output parameter values.
*/
server_status.SERVER_PS_OUT_PARAMS = 4096;

server_status.SERVER_STATUS_IN_TRANS_READONLY = 0x2000; // in a read-only transaction
server_status.SERVER_SESSION_STATE_CHANGED = 0x4000;

// inverse of charset_encodings
// given encoding, get matching mysql charset number

var encoding_charset = {
  big5: 1,
  latin2: 2,
  dec8: 3,
  cp850: 4,
  latin1: 5,
  hp8: 6,
  koi8r: 7,
  swe7: 10,
  ascii: 11,
  eucjp: 12,
  sjis: 13,
  cp1251: 14,
  hebrew: 16,
  tis620: 18,
  euckr: 19,
  latin7: 20,
  koi8u: 22,
  gb2312: 24,
  greek: 25,
  cp1250: 26,
  gbk: 28,
  cp1257: 29,
  latin5: 30,
  armscii8: 32,
  cesu8: 33,
  ucs2: 35,
  cp866: 36,
  keybcs2: 37,
  macintosh: 38,
  macroman: 39,
  cp852: 40,
  utf8: 45,
  utf8mb4: 45,
  utf16: 54,
  utf16le: 56,
  cp1256: 57,
  utf32: 60,
  binary: 63,
  geostd8: 92,
  cp932: 95,
  eucjpms: 97,
  gb18030: 248,
  utf8mb3: 192,
};

var session_track = {};

(function (exports) {

	exports.SYSTEM_VARIABLES = 0;
	exports.SCHEMA = 1;
	exports.STATE_CHANGE = 2;
	exports.STATE_GTIDS = 3;
	exports.TRANSACTION_CHARACTERISTICS = 4;
	exports.TRANSACTION_STATE = 5;

	exports.FIRST_KEY = exports.SYSTEM_VARIABLES;
	exports.LAST_KEY = exports.TRANSACTION_STATE; 
} (session_track));

// TODO: rename to OK packet
// https://dev.mysql.com/doc/internals/en/packet-OK_Packet.html

const Packet$4 = packet;
const ClientConstants$4 = client;
const ServerSatusFlags = server_status;

const EncodingToCharset = encoding_charset;
const sessionInfoTypes = session_track;

class ResultSetHeader {
  constructor(packet, connection) {
    const bigNumberStrings = connection.config.bigNumberStrings;
    const encoding = connection.serverEncoding;
    const flags = connection._handshakePacket.capabilityFlags;
    const isSet = function (flag) {
      return flags & ClientConstants$4[flag];
    };
    if (packet.buffer[packet.offset] !== 0) {
      this.fieldCount = packet.readLengthCodedNumber();
      if (this.fieldCount === null) {
        this.infileName = packet.readString(undefined, encoding);
      }
      return;
    }
    this.fieldCount = packet.readInt8(); // skip OK byte
    this.affectedRows = packet.readLengthCodedNumber(bigNumberStrings);
    this.insertId = packet.readLengthCodedNumberSigned(bigNumberStrings);
    this.info = '';
    if (isSet('PROTOCOL_41')) {
      this.serverStatus = packet.readInt16();
      this.warningStatus = packet.readInt16();
    } else if (isSet('TRANSACTIONS')) {
      this.serverStatus = packet.readInt16();
    }
    let stateChanges = null;
    if (isSet('SESSION_TRACK') && packet.offset < packet.end) {
      this.info = packet.readLengthCodedString(encoding);

      if (this.serverStatus & ServerSatusFlags.SERVER_SESSION_STATE_CHANGED) {
        // session change info record - see
        // https://dev.mysql.com/doc/internals/en/packet-OK_Packet.html#cs-sect-packet-ok-sessioninfo
        let len =
          packet.offset < packet.end ? packet.readLengthCodedNumber() : 0;
        const end = packet.offset + len;
        let type, key, stateEnd;
        if (len > 0) {
          stateChanges = {
            systemVariables: {},
            schema: null,
            gtids: [],
            trackStateChange: null,
          };
        }
        while (packet.offset < end) {
          type = packet.readInt8();
          len = packet.readLengthCodedNumber();
          stateEnd = packet.offset + len;
          if (type === sessionInfoTypes.SYSTEM_VARIABLES) {
            key = packet.readLengthCodedString(encoding);
            const val = packet.readLengthCodedString(encoding);
            stateChanges.systemVariables[key] = val;
            if (key === 'character_set_client') {
              const charsetNumber = EncodingToCharset[val];
              // TODO - better api for driver users to handle unknown encodings?
              // maybe custom coverter in the config?
              // For now just ignore character_set_client command if there is
              // no known mapping from reported encoding to a charset code
              if (typeof charsetNumber !== 'undefined') {
                connection.config.charsetNumber = charsetNumber;
              }
            }
          } else if (type === sessionInfoTypes.SCHEMA) {
            key = packet.readLengthCodedString(encoding);
            stateChanges.schema = key;
          } else if (type === sessionInfoTypes.STATE_CHANGE) {
            stateChanges.trackStateChange =
              packet.readLengthCodedString(encoding);
          } else if (type === sessionInfoTypes.STATE_GTIDS) {
            // TODO: find if the first length coded string means anything. Usually comes as empty
            // eslint-disable-next-line no-unused-vars
            packet.readLengthCodedString(encoding);
            const gtid = packet.readLengthCodedString(encoding);
            stateChanges.gtids = gtid.split(',');
          } else ;
          packet.offset = stateEnd;
        }
      }
    } else {
      this.info = packet.readString(undefined, encoding);
    }
    if (stateChanges) {
      this.stateChanges = stateChanges;
    }
    const m = this.info.match(/\schanged:\s*(\d+)/i);
    if (m !== null) {
      this.changedRows = parseInt(m[1], 10);
    } else {
      this.changedRows = 0;
    }
  }

  // TODO: should be consistent instance member, but it's just easier here to have just function
  static toPacket(fieldCount, insertId) {
    let length = 4 + Packet$4.lengthCodedNumberLength(fieldCount);
    if (typeof insertId !== 'undefined') {
      length += Packet$4.lengthCodedNumberLength(insertId);
    }
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$4(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeLengthCodedNumber(fieldCount);
    if (typeof insertId !== 'undefined') {
      packet.writeLengthCodedNumber(insertId);
    }
    return packet;
  }
}

var resultset_header = ResultSetHeader;

const ClientConstants$3 = client;
const Packet$3 = packet;

class SSLRequest {
  constructor(flags, charset) {
    this.clientFlags = flags | ClientConstants$3.SSL;
    this.charset = charset;
  }

  toPacket() {
    const length = 36;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet$3(0, buffer, 0, length);
    buffer.fill(0);
    packet.offset = 4;
    packet.writeInt32(this.clientFlags);
    packet.writeInt32(0); // max packet size. todo: move to config
    packet.writeInt8(this.charset);
    return packet;
  }
}

var ssl_request = SSLRequest;

const Packet$2 = packet;

class TextRow {
  constructor(columns) {
    this.columns = columns || [];
  }

  static fromPacket(packet) {
    // packet.reset(); // set offset to starting point?
    const columns = [];
    while (packet.haveMoreData()) {
      columns.push(packet.readLengthCodedString());
    }
    return new TextRow(columns);
  }

  static toPacket(columns, encoding) {
    const sequenceId = 0; // TODO remove, this is calculated now in connecton
    let length = 0;
    columns.forEach((val) => {
      if (val === null || typeof val === 'undefined') {
        ++length;
        return;
      }
      length += Packet$2.lengthCodedStringLength(val.toString(10), encoding);
    });
    const buffer = Buffer.allocUnsafe(length + 4);
    const packet = new Packet$2(sequenceId, buffer, 0, length + 4);
    packet.offset = 4;
    columns.forEach((val) => {
      if (val === null) {
        packet.writeNull();
        return;
      }
      if (typeof val === 'undefined') {
        packet.writeInt8(0);
        return;
      }
      packet.writeLengthCodedString(val.toString(10), encoding);
    });
    return packet;
  }
}

var text_row = TextRow;

(function (module, exports) {

	const process = require$$0$6;

	const AuthNextFactor = auth_next_factor;
	const AuthSwitchRequest = auth_switch_request;
	const AuthSwitchRequestMoreData = auth_switch_request_more_data;
	const AuthSwitchResponse = auth_switch_response;
	const BinaryRow = binary_row;
	const BinlogDump = binlog_dump$1;
	const ChangeUser = change_user$1;
	const CloseStatement = close_statement$1;
	const ColumnDefinition = column_definition;
	const Execute = execute$1;
	const Handshake = handshake;
	const HandshakeResponse = handshake_response;
	const PrepareStatement = prepare_statement;
	const PreparedStatementHeader = prepared_statement_header;
	const Query = query$1;
	const RegisterSlave = register_slave$1;
	const ResetConnection = reset_connection$1;
	const ResultSetHeader = resultset_header;
	const SSLRequest = ssl_request;
	const TextRow = text_row;

	const ctorMap = {
	  AuthNextFactor,
	  AuthSwitchRequest,
	  AuthSwitchRequestMoreData,
	  AuthSwitchResponse,
	  BinaryRow,
	  BinlogDump,
	  ChangeUser,
	  CloseStatement,
	  ColumnDefinition,
	  Execute,
	  Handshake,
	  HandshakeResponse,
	  PrepareStatement,
	  PreparedStatementHeader,
	  Query,
	  RegisterSlave,
	  ResetConnection,
	  ResultSetHeader,
	  SSLRequest,
	  TextRow,
	};
	Object.entries(ctorMap).forEach(([name, ctor]) => {
	  module.exports[name] = ctor;
	  // monkey-patch it to include name if debug is on
	  if (process.env.NODE_DEBUG) {
	    if (ctor.prototype.toPacket) {
	      const old = ctor.prototype.toPacket;
	      ctor.prototype.toPacket = function () {
	        const p = old.call(this);
	        p._name = name;
	        return p;
	      };
	    }
	  }
	});

	// simple packets:
	const Packet = packet;
	exports.Packet = Packet;

	class OK {
	  static toPacket(args, encoding) {
	    args = args || {};
	    const affectedRows = args.affectedRows || 0;
	    const insertId = args.insertId || 0;
	    const serverStatus = args.serverStatus || 0;
	    const warningCount = args.warningCount || 0;
	    const message = args.message || '';

	    let length = 9 + Packet.lengthCodedNumberLength(affectedRows);
	    length += Packet.lengthCodedNumberLength(insertId);

	    const buffer = Buffer.allocUnsafe(length);
	    const packet = new Packet(0, buffer, 0, length);
	    packet.offset = 4;
	    packet.writeInt8(0);
	    packet.writeLengthCodedNumber(affectedRows);
	    packet.writeLengthCodedNumber(insertId);
	    packet.writeInt16(serverStatus);
	    packet.writeInt16(warningCount);
	    packet.writeString(message, encoding);
	    packet._name = 'OK';
	    return packet;
	  }
	}

	exports.OK = OK;

	// warnings, statusFlags
	class EOF {
	  static toPacket(warnings, statusFlags) {
	    if (typeof warnings === 'undefined') {
	      warnings = 0;
	    }
	    if (typeof statusFlags === 'undefined') {
	      statusFlags = 0;
	    }
	    const packet = new Packet(0, Buffer.allocUnsafe(9), 0, 9);
	    packet.offset = 4;
	    packet.writeInt8(0xfe);
	    packet.writeInt16(warnings);
	    packet.writeInt16(statusFlags);
	    packet._name = 'EOF';
	    return packet;
	  }
	}

	exports.EOF = EOF;

	class Error {
	  static toPacket(args, encoding) {
	    const length = 13 + Buffer.byteLength(args.message, 'utf8');
	    const packet = new Packet(0, Buffer.allocUnsafe(length), 0, length);
	    packet.offset = 4;
	    packet.writeInt8(0xff);
	    packet.writeInt16(args.code);
	    // TODO: sql state parameter
	    packet.writeString('#_____', encoding);
	    packet.writeString(args.message, encoding);
	    packet._name = 'Error';
	    return packet;
	  }

	  static fromPacket(packet) {
	    packet.readInt8(); // marker
	    const code = packet.readInt16();
	    packet.readString(1, 'ascii'); // sql state marker
	    // The SQL state of the ERR_Packet which is always 5 bytes long.
	    // https://dev.mysql.com/doc/dev/mysql-server/8.0.11/page_protocol_basic_dt_strings.html#sect_protocol_basic_dt_string_fix
	    packet.readString(5, 'ascii'); // sql state (ignore for now)
	    const message = packet.readNullTerminatedString('utf8');
	    const error = new Error();
	    error.message = message;
	    error.code = code;
	    return error;
	  }
	}

	exports.Error = Error; 
} (packets, packets.exports));

var packetsExports = packets.exports;

const EventEmitter$5 = require$$1$2.EventEmitter;
const Timers$2 = require$$2$1;

let Command$c = class Command extends EventEmitter$5 {
  constructor() {
    super();
    this.next = null;
  }

  // slow. debug only
  stateName() {
    const state = this.next;
    for (const i in this) {
      if (this[i] === state && i !== 'next') {
        return i;
      }
    }
    return 'unknown name';
  }

  execute(packet, connection) {
    if (!this.next) {
      this.next = this.start;
      connection._resetSequenceId();
    }
    if (packet && packet.isError()) {
      const err = packet.asError(connection.clientEncoding);
      err.sql = this.sql || this.query;
      if (this.queryTimeout) {
        Timers$2.clearTimeout(this.queryTimeout);
        this.queryTimeout = null;
      }
      if (this.onResult) {
        this.onResult(err);
        this.emit('end');
      } else {
        this.emit('error', err);
        this.emit('end');
      }
      return true;
    }
    // TODO: don't return anything from execute, it's ugly and error-prone. Listen for 'end' event in connection
    this.next = this.next(packet, connection);
    if (this.next) {
      return false;
    }
    this.emit('end');
    return true;
  }
};

var command = Command$c;

const PLUGIN_NAME$1 = 'sha256_password';
const crypto$2 = require$$0$3;
const { xorRotating: xorRotating$1 } = auth_41;
const Tls$1 = require$$1$1;

const REQUEST_SERVER_KEY_PACKET$1 = Buffer.from([1]);

const STATE_INITIAL$1 = 0;
const STATE_WAIT_SERVER_KEY$1 = 1;
const STATE_FINAL$1 = -1;

function encrypt$1(password, scramble, key) {
  const stage1 = xorRotating$1(Buffer.from(`${password}\0`, 'utf8'), scramble);
  return crypto$2.publicEncrypt(
    {
      key,
      oaepHash: 'sha1',
    },
    stage1
  );
}

var sha256_password$1 =
  (pluginOptions = {}) =>
  ({ connection }) => {
    let state = 0;
    let scramble = null;

    const password = connection.config.password;

    const authWithKey = (serverKey) => {
      const _password = encrypt$1(password, scramble, serverKey);
      state = STATE_FINAL$1;
      return _password;
    };

    return (data) => {
      switch (state) {
        case STATE_INITIAL$1:
          if (
            connection.stream instanceof Tls$1.TLSSocket &&
            connection.stream.encrypted === true
          ) {
            // We don't need to encrypt passwords over TLS connection
            return Buffer.from(`${password}\0`, 'utf8');
          }

          scramble = data.slice(0, 20);
          // if client provides key we can save one extra roundrip on first connection
          if (pluginOptions.serverPublicKey) {
            return authWithKey(pluginOptions.serverPublicKey);
          }

          state = STATE_WAIT_SERVER_KEY$1;
          return REQUEST_SERVER_KEY_PACKET$1;

        case STATE_WAIT_SERVER_KEY$1:
          if (pluginOptions.onServerPublicKey) {
            pluginOptions.onServerPublicKey(data);
          }
          return authWithKey(data);
        case STATE_FINAL$1:
          throw new Error(
            `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME$1} plugin in STATE_FINAL state.`
          );
      }

      throw new Error(
        `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME$1} plugin in state ${state}`
      );
    };
  };

var caching_sha2_password$1 = {exports: {}};

// https://mysqlserverteam.com/mysql-8-0-4-new-default-authentication-plugin-caching_sha2_password/

const PLUGIN_NAME = 'caching_sha2_password';
const crypto$1 = require$$0$3;
const { xor, xorRotating } = auth_41;

const REQUEST_SERVER_KEY_PACKET = Buffer.from([2]);
const FAST_AUTH_SUCCESS_PACKET = Buffer.from([3]);
const PERFORM_FULL_AUTHENTICATION_PACKET = Buffer.from([4]);

const STATE_INITIAL = 0;
const STATE_TOKEN_SENT = 1;
const STATE_WAIT_SERVER_KEY = 2;
const STATE_FINAL = -1;

function sha256(msg) {
  const hash = crypto$1.createHash('sha256');
  hash.update(msg);
  return hash.digest();
}

function calculateToken(password, scramble) {
  if (!password) {
    return Buffer.alloc(0);
  }
  const stage1 = sha256(Buffer.from(password));
  const stage2 = sha256(stage1);
  const stage3 = sha256(Buffer.concat([stage2, scramble]));
  return xor(stage1, stage3);
}

function encrypt(password, scramble, key) {
  const stage1 = xorRotating(Buffer.from(`${password}\0`, 'utf8'), scramble);
  return crypto$1.publicEncrypt(
    {
      key,
      oaepHash: 'sha1',
      padding: crypto$1.constants.RSA_PKCS1_OAEP_PADDING,
    },
    stage1
  );
}

const pluginFactory =
  (pluginOptions = {}) =>
  ({ connection }) => {
    let state = 0;
    let scramble = null;

    const password = connection.config.password;

    const authWithKey = (serverKey) => {
      const _password = encrypt(password, scramble, serverKey);
      state = STATE_FINAL;
      return _password;
    };

    return (data) => {
      switch (state) {
        case STATE_INITIAL:
          scramble = data.slice(0, 20);
          state = STATE_TOKEN_SENT;
          return calculateToken(password, scramble);

        case STATE_TOKEN_SENT:
          if (FAST_AUTH_SUCCESS_PACKET.equals(data)) {
            state = STATE_FINAL;
            return null;
          }

          if (PERFORM_FULL_AUTHENTICATION_PACKET.equals(data)) {
            const isSecureConnection =
              typeof pluginOptions.overrideIsSecure === 'undefined'
                ? connection.config.ssl || connection.config.socketPath
                : pluginOptions.overrideIsSecure;
            if (isSecureConnection) {
              state = STATE_FINAL;
              return Buffer.from(`${password}\0`, 'utf8');
            }

            // if client provides key we can save one extra roundrip on first connection
            if (pluginOptions.serverPublicKey) {
              return authWithKey(pluginOptions.serverPublicKey);
            }

            state = STATE_WAIT_SERVER_KEY;
            return REQUEST_SERVER_KEY_PACKET;
          }
          throw new Error(
            `Invalid AuthMoreData packet received by ${PLUGIN_NAME} plugin in STATE_TOKEN_SENT state.`
          );
        case STATE_WAIT_SERVER_KEY:
          if (pluginOptions.onServerPublicKey) {
            pluginOptions.onServerPublicKey(data);
          }
          return authWithKey(data);
        case STATE_FINAL:
          throw new Error(
            `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in STATE_FINAL state.`
          );
      }

      throw new Error(
        `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in state ${state}`
      );
    };
  };

// Export the plugin factory as default
caching_sha2_password$1.exports = pluginFactory;

// Export calculateToken for reuse in initial handshake optimization
caching_sha2_password$1.exports.calculateToken = calculateToken;

var caching_sha2_passwordExports = caching_sha2_password$1.exports;

//const PLUGIN_NAME = 'mysql_native_password';
const auth41$1 = auth_41;

var mysql_native_password$1 =
  (pluginOptions) =>
  ({ connection, command }) => {
    const password =
      command.password || pluginOptions.password || connection.config.password;
    const passwordSha1 =
      command.passwordSha1 ||
      pluginOptions.passwordSha1 ||
      connection.config.passwordSha1;
    return (data) => {
      const authPluginData1 = data.slice(0, 8);
      const authPluginData2 = data.slice(8, 20);
      let authToken;
      if (passwordSha1) {
        authToken = auth41$1.calculateTokenFromPasswordSha(
          passwordSha1,
          authPluginData1,
          authPluginData2
        );
      } else {
        authToken = auth41$1.calculateToken(
          password,
          authPluginData1,
          authPluginData2
        );
      }
      return authToken;
    };
  };

function bufferFromStr(str) {
  return Buffer.from(`${str}\0`);
}

const create_mysql_clear_password_plugin = (pluginOptions) =>
  function mysql_clear_password_plugin({ connection, command }) {
    const password =
      command.password || pluginOptions.password || connection.config.password;

    return function (/* pluginData */) {
      return bufferFromStr(password);
    };
  };

var mysql_clear_password$1 = create_mysql_clear_password_plugin;

const Packets$b = packetsExports;
const sha256_password = sha256_password$1;
const caching_sha2_password = caching_sha2_passwordExports;
const mysql_native_password = mysql_native_password$1;
const mysql_clear_password = mysql_clear_password$1;

// Use Object.create(null) to avoid prototype pollution
// This prevents server-controlled pluginName values like "toString" or "__proto__"
// from resolving to prototype properties
const standardAuthPlugins = Object.assign(Object.create(null), {
  sha256_password: sha256_password({}),
  caching_sha2_password: caching_sha2_password({}),
  mysql_native_password: mysql_native_password({}),
  mysql_clear_password: mysql_clear_password({}),
});

// Helper function to get auth plugin (custom or standard)
function getAuthPlugin$1(pluginName, connection) {
  const customPlugins = connection.config.authPlugins;

  // Check custom plugins with hasOwnProperty for safety
  if (
    customPlugins &&
    Object.prototype.hasOwnProperty.call(customPlugins, pluginName)
  ) {
    return customPlugins[pluginName];
  }

  // Safe to access standardAuthPlugins directly since it has no prototype
  return standardAuthPlugins[pluginName];
}

function warnLegacyAuthSwitch() {
  console.warn(
    'WARNING! authSwitchHandler api is deprecated, please use new authPlugins api'
  );
}

function authSwitchPluginError(error, command) {
  // Authentication errors are fatal
  error.code = 'AUTH_SWITCH_PLUGIN_ERROR';
  error.fatal = true;

  command.emit('error', error);
}

function authSwitchRequest(packet, connection, command) {
  const { pluginName, pluginData } =
    Packets$b.AuthSwitchRequest.fromPacket(packet);

  // legacy plugin api don't allow to override mysql_native_password
  // if pluginName is mysql_native_password it's using standard auth4.1 auth
  if (
    connection.config.authSwitchHandler &&
    pluginName !== 'mysql_native_password'
  ) {
    const legacySwitchHandler = connection.config.authSwitchHandler;
    warnLegacyAuthSwitch();
    legacySwitchHandler({ pluginName, pluginData }, (err, data) => {
      if (err) {
        return authSwitchPluginError(err, command);
      }
      connection.writePacket(new Packets$b.AuthSwitchResponse(data).toPacket());
    });
    return;
  }

  if (pluginName === 'mysql_clear_password') {
    const hasCustomPlugin =
      connection.config.authPlugins &&
      Object.prototype.hasOwnProperty.call(
        connection.config.authPlugins,
        'mysql_clear_password'
      );
    if (!hasCustomPlugin && !connection.config.enableCleartextPlugin) {
      const err = new Error(
        'Server requested authentication using mysql_clear_password, ' +
          'which sends the password in plaintext over the network and is ' +
          'disabled by default. To enable it, set the `enableCleartextPlugin` ' +
          'option to `true` in your connection configuration, or provide a ' +
          'custom `mysql_clear_password` auth plugin via the `authPlugins` ' +
          'option. Only use this over a secure connection (TLS/SSL).'
      );
      err.code = 'MYSQL_CLEAR_PASSWORD_NOT_ENABLED';
      err.fatal = true;
      throw err;
    }
  }

  const authPlugin = getAuthPlugin$1(pluginName, connection);
  if (!authPlugin) {
    throw new Error(
      `Server requests authentication using unknown plugin ${pluginName}. See ${'TODO: add plugins doco here'} on how to configure or author authentication plugins.`
    );
  }
  connection._authPlugin = authPlugin({ connection, command });
  Promise.resolve(connection._authPlugin(pluginData))
    .then((data) => {
      if (data) {
        connection.writePacket(new Packets$b.AuthSwitchResponse(data).toPacket());
      }
    })
    .catch((err) => {
      authSwitchPluginError(err, command);
    });
}

function authSwitchRequestMoreData(packet, connection, command) {
  const { data } = Packets$b.AuthSwitchRequestMoreData.fromPacket(packet);

  if (connection.config.authSwitchHandler) {
    const legacySwitchHandler = connection.config.authSwitchHandler;
    warnLegacyAuthSwitch();
    legacySwitchHandler({ pluginData: data }, (err, data) => {
      if (err) {
        return authSwitchPluginError(err, command);
      }
      connection.writePacket(new Packets$b.AuthSwitchResponse(data).toPacket());
    });
    return;
  }

  if (!connection._authPlugin) {
    throw new Error(
      'AuthPluginMoreData received but no auth plugin instance found'
    );
  }
  Promise.resolve(connection._authPlugin(data))
    .then((data) => {
      if (data) {
        connection.writePacket(new Packets$b.AuthSwitchResponse(data).toPacket());
      }
    })
    .catch((err) => {
      authSwitchPluginError(err, command);
    });
}

var auth_switch = {
  authSwitchRequest,
  authSwitchRequestMoreData,
  getAuthPlugin: getAuthPlugin$1,
  standardAuthPlugins,
};

const require$$0$2 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(zlib);

var compressed_protocol;
var hasRequiredCompressed_protocol;

function requireCompressed_protocol () {
	if (hasRequiredCompressed_protocol) return compressed_protocol;
	hasRequiredCompressed_protocol = 1;

	// connection mixins
	// implementation of http://dev.mysql.com/doc/internals/en/compression.html

	const zlib = require$$0$2;
	const PacketParser = packet_parser;

	class Queue {
	  constructor() {
	    this._queue = [];
	    this._running = false;
	  }

	  push(fn) {
	    this._queue.push(fn);
	    if (!this._running) {
	      this._running = true;
	      process.nextTick(() => this._next());
	    }
	  }

	  _next() {
	    const task = this._queue.shift();
	    if (!task) {
	      this._running = false;
	      return;
	    }
	    task({
	      done: () => process.nextTick(() => this._next()),
	    });
	  }
	}

	function handleCompressedPacket(packet) {
	  // eslint-disable-next-line consistent-this, no-invalid-this
	  const connection = this;
	  const deflatedLength = packet.readInt24();
	  const body = packet.readBuffer();

	  if (deflatedLength !== 0) {
	    connection.inflateQueue.push((task) => {
	      zlib.inflate(body, (err, data) => {
	        if (err) {
	          connection._handleNetworkError(err);
	          return;
	        }
	        connection._bumpCompressedSequenceId(packet.numPackets);
	        connection._inflatedPacketsParser.execute(data);
	        task.done();
	      });
	    });
	  } else {
	    connection.inflateQueue.push((task) => {
	      connection._bumpCompressedSequenceId(packet.numPackets);
	      connection._inflatedPacketsParser.execute(body);
	      task.done();
	    });
	  }
	}

	function writeCompressed(buffer) {
	  // http://dev.mysql.com/doc/internals/en/example-several-mysql-packets.html
	  // note: sending a MySQL Packet of the size 2^24−5 to 2^24−1 via compression
	  // leads to at least one extra compressed packet.
	  // (this is because "length of the packet before compression" need to fit
	  // into 3 byte unsigned int. "length of the packet before compression" includes
	  // 4 byte packet header, hence 2^24−5)
	  const MAX_COMPRESSED_LENGTH = 16777210;
	  let start;
	  if (buffer.length > MAX_COMPRESSED_LENGTH) {
	    for (start = 0; start < buffer.length; start += MAX_COMPRESSED_LENGTH) {
	      writeCompressed.call(
	        // eslint-disable-next-line no-invalid-this
	        this,
	        buffer.slice(start, start + MAX_COMPRESSED_LENGTH)
	      );
	    }
	    return;
	  }

	  // eslint-disable-next-line no-invalid-this, consistent-this
	  const connection = this;

	  let packetLen = buffer.length;
	  const compressHeader = Buffer.allocUnsafe(7);

	  // seqqueue is used here because zlib async execution is routed via thread pool
	  // internally and when we have multiple compressed packets arriving we need
	  // to assemble uncompressed result sequentially
	  (function (seqId) {
	    connection.deflateQueue.push((task) => {
	      zlib.deflate(buffer, (err, compressed) => {
	        if (err) {
	          connection._handleFatalError(err);
	          return;
	        }
	        let compressedLength = compressed.length;

	        if (compressedLength < packetLen) {
	          compressHeader.writeUInt8(compressedLength & 0xff, 0);
	          compressHeader.writeUInt16LE(compressedLength >> 8, 1);
	          compressHeader.writeUInt8(seqId, 3);
	          compressHeader.writeUInt8(packetLen & 0xff, 4);
	          compressHeader.writeUInt16LE(packetLen >> 8, 5);
	          connection.writeUncompressed(compressHeader);
	          connection.writeUncompressed(compressed);
	        } else {
	          // http://dev.mysql.com/doc/internals/en/uncompressed-payload.html
	          // To send an uncompressed payload:
	          //   - set length of payload before compression to 0
	          //   - the compressed payload contains the uncompressed payload instead.
	          compressedLength = packetLen;
	          packetLen = 0;
	          compressHeader.writeUInt8(compressedLength & 0xff, 0);
	          compressHeader.writeUInt16LE(compressedLength >> 8, 1);
	          compressHeader.writeUInt8(seqId, 3);
	          compressHeader.writeUInt8(packetLen & 0xff, 4);
	          compressHeader.writeUInt16LE(packetLen >> 8, 5);
	          connection.writeUncompressed(compressHeader);
	          connection.writeUncompressed(buffer);
	        }
	        task.done();
	      });
	    });
	  })(connection.compressedSequenceId);
	  connection._bumpCompressedSequenceId(1);
	}

	function enableCompression(connection) {
	  connection._lastWrittenPacketId = 0;
	  connection._lastReceivedPacketId = 0;

	  connection._handleCompressedPacket = handleCompressedPacket;
	  connection._inflatedPacketsParser = new PacketParser((p) => {
	    connection.handlePacket(p);
	  }, 4);
	  connection._inflatedPacketsParser._lastPacket = 0;
	  connection.packetParser = new PacketParser((packet) => {
	    connection._handleCompressedPacket(packet);
	  }, 7);

	  connection.writeUncompressed = connection.write;
	  connection.write = writeCompressed;

	  connection.inflateQueue = new Queue();
	  connection.deflateQueue = new Queue();
	}

	compressed_protocol = {
	  enableCompression: enableCompression,
	  Queue: Queue,
	};
	return compressed_protocol;
}

const Command$b = command;
const Packets$a = packetsExports;
const ClientConstants$2 = client;
const CharsetToEncoding$2 = /*@__PURE__*/ requireCharset_encodings();
const auth41 = auth_41;
const { getAuthPlugin } = auth_switch;
const {
  calculateToken: calculateSha2Token,
} = caching_sha2_passwordExports;

function flagNames(flags) {
  const res = [];
  for (const c in ClientConstants$2) {
    if (flags & ClientConstants$2[c]) {
      res.push(c.replace(/_/g, ' ').toLowerCase());
    }
  }
  return res;
}

let ClientHandshake$2 = class ClientHandshake extends Command$b {
  constructor(clientFlags) {
    super();
    this.handshake = null;
    this.clientFlags = clientFlags;
    this.authenticationFactor = 0;
  }

  start() {
    return ClientHandshake.prototype.handshakeInit;
  }

  sendSSLRequest(connection) {
    const sslRequest = new Packets$a.SSLRequest(
      this.clientFlags,
      connection.config.charsetNumber
    );
    connection.writePacket(sslRequest.toPacket());
  }

  sendCredentials(connection) {
    if (connection.config.debug) {
      console.log(
        'Sending handshake packet: flags:%d=(%s)',
        this.clientFlags,
        flagNames(this.clientFlags).join(', ')
      );
    }
    this.user = connection.config.user;
    this.password = connection.config.password;
    // "password1" is an alias to the original "password" value
    // to make it easier to integrate multi-factor authentication
    this.password1 = connection.config.password;
    // "password2" and "password3" are the 2nd and 3rd factor authentication
    // passwords, which can be undefined depending on the authentication
    // plugin being used
    this.password2 = connection.config.password2;
    this.password3 = connection.config.password3;
    this.passwordSha1 = connection.config.passwordSha1;
    this.database = connection.config.database;
    this.authPluginName = this.handshake.authPluginName;

    // Optimization: Try to use the server's preferred authentication method
    // to avoid an unnecessary auth switch roundtrip
    const serverAuthMethod = this.handshake.authPluginName;
    const isSecureConnection =
      connection.config.ssl || connection.config.socketPath;

    // Combine auth plugin data for easier handling
    // Note: authPluginData2 can include a trailing NUL byte when PLUGIN_AUTH is set
    // We must ensure exactly 20 bytes for the scramble
    const authPluginData =
      this.handshake.authPluginData1 && this.handshake.authPluginData2
        ? Buffer.concat([
            this.handshake.authPluginData1,
            this.handshake.authPluginData2,
          ]).slice(0, 20)
        : Buffer.alloc(20);

    // Check if user has custom auth plugin or legacy handler for the server-advertised method
    // If so, we must not bypass the auth switch flow with our built-in implementation
    const hasCustomAuthPlugin =
      connection.config.authPlugins &&
      Object.prototype.hasOwnProperty.call(
        connection.config.authPlugins,
        serverAuthMethod
      );
    const hasLegacyAuthSwitchHandler =
      typeof connection.config.authSwitchHandler === 'function';

    // Determine which auth method to use
    // Try to use server's preferred method if we can, otherwise fallback to native
    const canUseDirectAuth =
      !hasCustomAuthPlugin &&
      !hasLegacyAuthSwitchHandler &&
      this.canUseAuthMethodDirectly(serverAuthMethod, isSecureConnection) &&
      (serverAuthMethod !== 'mysql_clear_password' ||
        connection.config.enableCleartextPlugin);

    const clientAuthMethod = canUseDirectAuth
      ? serverAuthMethod
      : 'mysql_native_password';

    // Calculate the auth token for the chosen method
    const authToken = this.calculateAuthToken(
      clientAuthMethod,
      this.password,
      authPluginData
    );

    if (connection.config.debug) {
      console.log(
        'Server auth method: %s, Using auth method: %s',
        serverAuthMethod,
        clientAuthMethod
      );
    }

    const handshakeResponse = new Packets$a.HandshakeResponse({
      flags: this.clientFlags,
      user: this.user,
      database: this.database,
      password: this.password,
      passwordSha1: this.passwordSha1,
      charsetNumber: connection.config.charsetNumber,
      authPluginData1: this.handshake.authPluginData1,
      authPluginData2: this.handshake.authPluginData2,
      compress: connection.config.compress,
      connectAttributes: connection.config.connectAttributes,
      authToken: authToken,
      authPluginName: clientAuthMethod,
    });
    connection.writePacket(handshakeResponse.toPacket());

    // If we used a non-native auth method in the initial handshake response,
    // we need to prepare for potential AuthMoreData packets by creating
    // the appropriate auth plugin instance
    if (clientAuthMethod !== 'mysql_native_password') {
      this.initializeAuthPlugin(clientAuthMethod, authPluginData, connection);
    }
  }

  calculateNativePasswordAuthToken(authPluginData) {
    // TODO: dont split into authPluginData1 and authPluginData2, instead join when 1 & 2 received
    const authPluginData1 = authPluginData.slice(0, 8);
    const authPluginData2 = authPluginData.slice(8, 20);
    let authToken;
    if (this.passwordSha1) {
      authToken = auth41.calculateTokenFromPasswordSha(
        this.passwordSha1,
        authPluginData1,
        authPluginData2
      );
    } else {
      authToken = auth41.calculateToken(
        this.password,
        authPluginData1,
        authPluginData2
      );
    }
    return authToken;
  }

  calculateSha256Token(password, scramble) {
    // Reuse the token calculation from caching_sha2_password plugin
    // to avoid code duplication and ensure consistency
    return calculateSha2Token(password, scramble);
  }

  // Helper: Calculate auth token for a specific auth method
  calculateAuthToken(authMethod, password, authPluginData) {
    switch (authMethod) {
      case 'mysql_native_password':
        return this.calculateNativePasswordAuthToken(authPluginData);

      case 'caching_sha2_password':
        return this.calculateSha256Token(password, authPluginData);

      case 'sha256_password':
      case 'mysql_clear_password':
        // These methods send plaintext password over secure connections
        return password
          ? Buffer.from(`${password}\0`, 'utf8')
          : Buffer.alloc(0);

      default:
        // Unknown method - use native password as fallback
        return this.calculateNativePasswordAuthToken(authPluginData);
    }
  }

  // Helper: Determine if we can use a specific auth method directly
  canUseAuthMethodDirectly(authMethod, isSecureConnection) {
    switch (authMethod) {
      case 'mysql_native_password':
      case 'caching_sha2_password':
        // These methods work with or without SSL
        return true;

      case 'sha256_password':
      case 'mysql_clear_password':
        // These methods require secure connection for direct use
        return isSecureConnection;

      default:
        // Unknown methods - fallback to native password
        return false;
    }
  }

  // Helper: Initialize auth plugin for handling subsequent AuthMoreData packets
  initializeAuthPlugin(authMethod, authPluginData, connection) {
    const authPlugin = getAuthPlugin(authMethod, connection);
    if (!authPlugin) {
      return; // Plugin not found, will fallback to auth switch if needed
    }

    // Initialize the plugin with connection and command context
    const pluginHandler = authPlugin({ connection, command: this });
    connection._authPlugin = pluginHandler;

    // Prime the plugin by calling it with the scramble data
    // This advances the plugin's state machine (e.g., to STATE_TOKEN_SENT)
    // We don't send the result because we already included it in the handshake response
    try {
      Promise.resolve(pluginHandler(authPluginData)).catch((err) => {
        // Ignore errors during initialization since we already sent the token
        if (connection.config.debug) {
          console.log('Auth plugin initialization:', err.message);
        }
      });
    } catch (err) {
      // Ignore synchronous errors during initialization
      if (connection.config.debug) {
        console.log('Auth plugin initialization error:', err.message);
      }
    }
  }

  handshakeInit(helloPacket, connection) {
    this.on('error', (e) => {
      connection._fatalError = e;
      connection._protocolError = e;
    });
    this.handshake = Packets$a.Handshake.fromPacket(helloPacket);
    if (connection.config.debug) {
      console.log(
        'Server hello packet: capability flags:%d=(%s)',
        this.handshake.capabilityFlags,
        flagNames(this.handshake.capabilityFlags).join(', ')
      );
    }
    connection.serverCapabilityFlags = this.handshake.capabilityFlags;
    connection.serverEncoding = CharsetToEncoding$2[this.handshake.characterSet];
    connection.connectionId = this.handshake.connectionId;
    const serverSSLSupport =
      this.handshake.capabilityFlags & ClientConstants$2.SSL;
    // multi factor authentication is enabled with the
    // "MULTI_FACTOR_AUTHENTICATION" capability and should only be used if it
    // is supported by the server
    const multiFactorAuthentication =
      this.handshake.capabilityFlags &
      ClientConstants$2.MULTI_FACTOR_AUTHENTICATION;
    this.clientFlags = this.clientFlags | multiFactorAuthentication;
    // use compression only if requested by client and supported by server
    connection.config.compress =
      connection.config.compress &&
      this.handshake.capabilityFlags & ClientConstants$2.COMPRESS;
    this.clientFlags = this.clientFlags | connection.config.compress;
    if (connection.config.ssl) {
      // client requires SSL but server does not support it
      if (!serverSSLSupport) {
        const err = new Error('Server does not support secure connection');
        err.code = 'HANDSHAKE_NO_SSL_SUPPORT';
        err.fatal = true;
        this.emit('error', err);
        return false;
      }
      // send ssl upgrade request and immediately upgrade connection to secure
      this.clientFlags |= ClientConstants$2.SSL;
      this.sendSSLRequest(connection);
      connection.startTLS((err) => {
        // after connection is secure
        if (err) {
          // SSL negotiation error are fatal
          err.code = 'HANDSHAKE_SSL_ERROR';
          err.fatal = true;
          this.emit('error', err);
          return;
        }
        // rest of communication is encrypted
        this.sendCredentials(connection);
      });
    } else {
      this.sendCredentials(connection);
    }
    if (multiFactorAuthentication) {
      // if the server supports multi-factor authentication, we enable it in
      // the client
      this.authenticationFactor = 1;
    }
    return ClientHandshake.prototype.handshakeResult;
  }

  handshakeResult(packet, connection) {
    const marker = packet.peekByte();
    // packet can be OK_Packet, ERR_Packet, AuthSwitchRequest, AuthNextFactor
    // or AuthMoreData
    if (marker === 0xfe || marker === 1 || marker === 0x02) {
      const authSwitch = auth_switch;
      try {
        if (marker === 1) {
          authSwitch.authSwitchRequestMoreData(packet, connection, this);
        } else {
          // if authenticationFactor === 0, it means the server does not support
          // the multi-factor authentication capability
          if (this.authenticationFactor !== 0) {
            // if we are past the first authentication factor, we should use the
            // corresponding password (if there is one)
            connection.config.password =
              this[`password${this.authenticationFactor}`];
            // update the current authentication factor
            this.authenticationFactor += 1;
          }
          // if marker === 0x02, it means it is an AuthNextFactor packet,
          // which is similar in structure to an AuthSwitchRequest packet,
          // so, we can use it directly
          authSwitch.authSwitchRequest(packet, connection, this);
        }
        return ClientHandshake.prototype.handshakeResult;
      } catch (err) {
        if (!err.code) {
          err.code = 'AUTH_SWITCH_PLUGIN_ERROR';
        }
        err.fatal = true;

        if (this.onResult) {
          this.onResult(err);
        } else {
          this.emit('error', err);
        }
        return null;
      }
    }
    if (marker !== 0) {
      const err = new Error('Unexpected packet during handshake phase');
      // Unknown handshake errors are fatal
      err.code = 'HANDSHAKE_UNKNOWN_ERROR';
      err.fatal = true;

      if (this.onResult) {
        this.onResult(err);
      } else {
        this.emit('error', err);
      }
      return null;
    }
    // this should be called from ClientHandshake command only
    // and skipped when called from ChangeUser command
    if (!connection.authorized) {
      connection.authorized = true;
      if (connection.config.compress) {
        const enableCompression =
          /*@__PURE__*/ requireCompressed_protocol().enableCompression;
        enableCompression(connection);
      }
    }
    if (this.onResult) {
      this.onResult(null);
    }
    return null;
  }
};
var client_handshake = ClientHandshake$2;

const CommandCode$2 = commands$1;
const Errors$1 = errors;

const Command$a = command;
const Packets$9 = packetsExports;

let ServerHandshake$1 = class ServerHandshake extends Command$a {
  constructor(args) {
    super();
    this.args = args;
    /*
    this.protocolVersion = args.protocolVersion || 10;
    this.serverVersion   = args.serverVersion;
    this.connectionId    = args.connectionId,
    this.statusFlags     = args.statusFlags,
    this.characterSet    = args.characterSet,
    this.capabilityFlags = args.capabilityFlags || 512;
    */
  }

  start(packet, connection) {
    const serverHelloPacket = new Packets$9.Handshake(this.args);
    this.serverHello = serverHelloPacket;
    serverHelloPacket.setScrambleData((err) => {
      if (err) {
        connection.emit('error', new Error('Error generating random bytes'));
        return;
      }
      connection.writePacket(serverHelloPacket.toPacket(0));
    });
    return ServerHandshake.prototype.readClientReply;
  }

  readClientReply(packet, connection) {
    // check auth here
    const clientHelloReply = Packets$9.HandshakeResponse.fromPacket(
      packet,
      this.args.capabilityFlags
    );
    // TODO check we don't have something similar already
    connection.clientHelloReply = clientHelloReply;
    if (this.args.authCallback) {
      this.args.authCallback(
        {
          user: clientHelloReply.user,
          database: clientHelloReply.database,
          address: connection.stream.remoteAddress,
          authPluginData1: this.serverHello.authPluginData1,
          authPluginData2: this.serverHello.authPluginData2,
          authToken: clientHelloReply.authToken,
        },
        (err, mysqlError) => {
          // if (err)
          if (!mysqlError) {
            connection.writeOk();
          } else {
            // TODO create constants / errorToCode
            // 1045 = ER_ACCESS_DENIED_ERROR
            connection.writeError({
              message: mysqlError.message || '',
              code: mysqlError.code || 1045,
            });
            connection.close();
          }
        }
      );
    } else {
      connection.writeOk();
    }
    return ServerHandshake.prototype.dispatchCommands;
  }

  _isStatement(query, name) {
    const firstWord = query.split(' ')[0].toUpperCase();
    return firstWord === name;
  }

  dispatchCommands(packet, connection) {
    // command from client to server
    let knownCommand = true;
    const encoding = connection.clientHelloReply.encoding;
    const commandCode = packet.readInt8();
    switch (commandCode) {
      case CommandCode$2.STMT_PREPARE:
        if (connection.listeners('stmt_prepare').length) {
          const query = packet.readString(undefined, encoding);
          connection.emit('stmt_prepare', query);
        } else {
          connection.writeError({
            code: Errors$1.HA_ERR_INTERNAL_ERROR,
            message: 'No query handler for prepared statements.',
          });
        }
        break;
      case CommandCode$2.STMT_EXECUTE:
        if (connection.listeners('stmt_execute').length) {
          const { stmtId, flags, iterationCount, values } =
            Packets$9.Execute.fromPacket(packet, encoding);
          connection.emit(
            'stmt_execute',
            stmtId,
            flags,
            iterationCount,
            values
          );
        } else {
          connection.writeError({
            code: Errors$1.HA_ERR_INTERNAL_ERROR,
            message: 'No query handler for execute statements.',
          });
        }
        break;
      case CommandCode$2.QUIT:
        if (connection.listeners('quit').length) {
          connection.emit('quit');
        } else {
          connection.stream.end();
        }
        break;
      case CommandCode$2.INIT_DB:
        if (connection.listeners('init_db').length) {
          const schemaName = packet.readString(undefined, encoding);
          connection.emit('init_db', schemaName);
        } else {
          connection.writeOk();
        }
        break;
      case CommandCode$2.QUERY:
        if (connection.listeners('query').length) {
          const query = packet.readString(undefined, encoding);
          if (
            this._isStatement(query, 'PREPARE') ||
            this._isStatement(query, 'SET')
          ) {
            connection.emit('stmt_prepare', query);
          } else if (this._isStatement(query, 'EXECUTE')) {
            connection.emit('stmt_execute', null, null, null, null, query);
          } else connection.emit('query', query);
        } else {
          connection.writeError({
            code: Errors$1.HA_ERR_INTERNAL_ERROR,
            message: 'No query handler',
          });
        }
        break;
      case CommandCode$2.FIELD_LIST:
        if (connection.listeners('field_list').length) {
          const table = packet.readNullTerminatedString(encoding);
          const fields = packet.readString(undefined, encoding);
          connection.emit('field_list', table, fields);
        } else {
          connection.writeError({
            code: Errors$1.ER_WARN_DEPRECATED_SYNTAX,
            message:
              'As of MySQL 5.7.11, COM_FIELD_LIST is deprecated and will be removed in a future version of MySQL.',
          });
        }
        break;
      case CommandCode$2.PING:
        if (connection.listeners('ping').length) {
          connection.emit('ping');
        } else {
          connection.writeOk();
        }
        break;
      default:
        knownCommand = false;
    }
    if (connection.listeners('packet').length) {
      connection.emit('packet', packet.clone(), knownCommand, commandCode);
    } else if (!knownCommand) {
      console.log('Unknown command:', commandCode);
    }
    return ServerHandshake.prototype.dispatchCommands;
  }
};

var server_handshake = ServerHandshake$1;

var charsets = {};

var hasRequiredCharsets;

function requireCharsets () {
	if (hasRequiredCharsets) return charsets;
	hasRequiredCharsets = 1;
	(function (exports) {

		exports.BIG5_CHINESE_CI = 1;
		exports.LATIN2_CZECH_CS = 2;
		exports.DEC8_SWEDISH_CI = 3;
		exports.CP850_GENERAL_CI = 4;
		exports.LATIN1_GERMAN1_CI = 5;
		exports.HP8_ENGLISH_CI = 6;
		exports.KOI8R_GENERAL_CI = 7;
		exports.LATIN1_SWEDISH_CI = 8;
		exports.LATIN2_GENERAL_CI = 9;
		exports.SWE7_SWEDISH_CI = 10;
		exports.ASCII_GENERAL_CI = 11;
		exports.UJIS_JAPANESE_CI = 12;
		exports.SJIS_JAPANESE_CI = 13;
		exports.CP1251_BULGARIAN_CI = 14;
		exports.LATIN1_DANISH_CI = 15;
		exports.HEBREW_GENERAL_CI = 16;
		exports.TIS620_THAI_CI = 18;
		exports.EUCKR_KOREAN_CI = 19;
		exports.LATIN7_ESTONIAN_CS = 20;
		exports.LATIN2_HUNGARIAN_CI = 21;
		exports.KOI8U_GENERAL_CI = 22;
		exports.CP1251_UKRAINIAN_CI = 23;
		exports.GB2312_CHINESE_CI = 24;
		exports.GREEK_GENERAL_CI = 25;
		exports.CP1250_GENERAL_CI = 26;
		exports.LATIN2_CROATIAN_CI = 27;
		exports.GBK_CHINESE_CI = 28;
		exports.CP1257_LITHUANIAN_CI = 29;
		exports.LATIN5_TURKISH_CI = 30;
		exports.LATIN1_GERMAN2_CI = 31;
		exports.ARMSCII8_GENERAL_CI = 32;
		exports.UTF8_GENERAL_CI = 33;
		exports.CP1250_CZECH_CS = 34;
		exports.UCS2_GENERAL_CI = 35;
		exports.CP866_GENERAL_CI = 36;
		exports.KEYBCS2_GENERAL_CI = 37;
		exports.MACCE_GENERAL_CI = 38;
		exports.MACROMAN_GENERAL_CI = 39;
		exports.CP852_GENERAL_CI = 40;
		exports.LATIN7_GENERAL_CI = 41;
		exports.LATIN7_GENERAL_CS = 42;
		exports.MACCE_BIN = 43;
		exports.CP1250_CROATIAN_CI = 44;
		exports.UTF8MB4_GENERAL_CI = 45;
		exports.UTF8MB4_BIN = 46;
		exports.LATIN1_BIN = 47;
		exports.LATIN1_GENERAL_CI = 48;
		exports.LATIN1_GENERAL_CS = 49;
		exports.CP1251_BIN = 50;
		exports.CP1251_GENERAL_CI = 51;
		exports.CP1251_GENERAL_CS = 52;
		exports.MACROMAN_BIN = 53;
		exports.UTF16_GENERAL_CI = 54;
		exports.UTF16_BIN = 55;
		exports.UTF16LE_GENERAL_CI = 56;
		exports.CP1256_GENERAL_CI = 57;
		exports.CP1257_BIN = 58;
		exports.CP1257_GENERAL_CI = 59;
		exports.UTF32_GENERAL_CI = 60;
		exports.UTF32_BIN = 61;
		exports.UTF16LE_BIN = 62;
		exports.BINARY = 63;
		exports.ARMSCII8_BIN = 64;
		exports.ASCII_BIN = 65;
		exports.CP1250_BIN = 66;
		exports.CP1256_BIN = 67;
		exports.CP866_BIN = 68;
		exports.DEC8_BIN = 69;
		exports.GREEK_BIN = 70;
		exports.HEBREW_BIN = 71;
		exports.HP8_BIN = 72;
		exports.KEYBCS2_BIN = 73;
		exports.KOI8R_BIN = 74;
		exports.KOI8U_BIN = 75;
		exports.UTF8_TOLOWER_CI = 76;
		exports.LATIN2_BIN = 77;
		exports.LATIN5_BIN = 78;
		exports.LATIN7_BIN = 79;
		exports.CP850_BIN = 80;
		exports.CP852_BIN = 81;
		exports.SWE7_BIN = 82;
		exports.UTF8_BIN = 83;
		exports.BIG5_BIN = 84;
		exports.EUCKR_BIN = 85;
		exports.GB2312_BIN = 86;
		exports.GBK_BIN = 87;
		exports.SJIS_BIN = 88;
		exports.TIS620_BIN = 89;
		exports.UCS2_BIN = 90;
		exports.UJIS_BIN = 91;
		exports.GEOSTD8_GENERAL_CI = 92;
		exports.GEOSTD8_BIN = 93;
		exports.LATIN1_SPANISH_CI = 94;
		exports.CP932_JAPANESE_CI = 95;
		exports.CP932_BIN = 96;
		exports.EUCJPMS_JAPANESE_CI = 97;
		exports.EUCJPMS_BIN = 98;
		exports.CP1250_POLISH_CI = 99;
		exports.UTF16_UNICODE_CI = 101;
		exports.UTF16_ICELANDIC_CI = 102;
		exports.UTF16_LATVIAN_CI = 103;
		exports.UTF16_ROMANIAN_CI = 104;
		exports.UTF16_SLOVENIAN_CI = 105;
		exports.UTF16_POLISH_CI = 106;
		exports.UTF16_ESTONIAN_CI = 107;
		exports.UTF16_SPANISH_CI = 108;
		exports.UTF16_SWEDISH_CI = 109;
		exports.UTF16_TURKISH_CI = 110;
		exports.UTF16_CZECH_CI = 111;
		exports.UTF16_DANISH_CI = 112;
		exports.UTF16_LITHUANIAN_CI = 113;
		exports.UTF16_SLOVAK_CI = 114;
		exports.UTF16_SPANISH2_CI = 115;
		exports.UTF16_ROMAN_CI = 116;
		exports.UTF16_PERSIAN_CI = 117;
		exports.UTF16_ESPERANTO_CI = 118;
		exports.UTF16_HUNGARIAN_CI = 119;
		exports.UTF16_SINHALA_CI = 120;
		exports.UTF16_GERMAN2_CI = 121;
		exports.UTF16_CROATIAN_CI = 122;
		exports.UTF16_UNICODE_520_CI = 123;
		exports.UTF16_VIETNAMESE_CI = 124;
		exports.UCS2_UNICODE_CI = 128;
		exports.UCS2_ICELANDIC_CI = 129;
		exports.UCS2_LATVIAN_CI = 130;
		exports.UCS2_ROMANIAN_CI = 131;
		exports.UCS2_SLOVENIAN_CI = 132;
		exports.UCS2_POLISH_CI = 133;
		exports.UCS2_ESTONIAN_CI = 134;
		exports.UCS2_SPANISH_CI = 135;
		exports.UCS2_SWEDISH_CI = 136;
		exports.UCS2_TURKISH_CI = 137;
		exports.UCS2_CZECH_CI = 138;
		exports.UCS2_DANISH_CI = 139;
		exports.UCS2_LITHUANIAN_CI = 140;
		exports.UCS2_SLOVAK_CI = 141;
		exports.UCS2_SPANISH2_CI = 142;
		exports.UCS2_ROMAN_CI = 143;
		exports.UCS2_PERSIAN_CI = 144;
		exports.UCS2_ESPERANTO_CI = 145;
		exports.UCS2_HUNGARIAN_CI = 146;
		exports.UCS2_SINHALA_CI = 147;
		exports.UCS2_GERMAN2_CI = 148;
		exports.UCS2_CROATIAN_CI = 149;
		exports.UCS2_UNICODE_520_CI = 150;
		exports.UCS2_VIETNAMESE_CI = 151;
		exports.UCS2_GENERAL_MYSQL500_CI = 159;
		exports.UTF32_UNICODE_CI = 160;
		exports.UTF32_ICELANDIC_CI = 161;
		exports.UTF32_LATVIAN_CI = 162;
		exports.UTF32_ROMANIAN_CI = 163;
		exports.UTF32_SLOVENIAN_CI = 164;
		exports.UTF32_POLISH_CI = 165;
		exports.UTF32_ESTONIAN_CI = 166;
		exports.UTF32_SPANISH_CI = 167;
		exports.UTF32_SWEDISH_CI = 168;
		exports.UTF32_TURKISH_CI = 169;
		exports.UTF32_CZECH_CI = 170;
		exports.UTF32_DANISH_CI = 171;
		exports.UTF32_LITHUANIAN_CI = 172;
		exports.UTF32_SLOVAK_CI = 173;
		exports.UTF32_SPANISH2_CI = 174;
		exports.UTF32_ROMAN_CI = 175;
		exports.UTF32_PERSIAN_CI = 176;
		exports.UTF32_ESPERANTO_CI = 177;
		exports.UTF32_HUNGARIAN_CI = 178;
		exports.UTF32_SINHALA_CI = 179;
		exports.UTF32_GERMAN2_CI = 180;
		exports.UTF32_CROATIAN_CI = 181;
		exports.UTF32_UNICODE_520_CI = 182;
		exports.UTF32_VIETNAMESE_CI = 183;
		exports.UTF8_UNICODE_CI = 192;
		exports.UTF8_ICELANDIC_CI = 193;
		exports.UTF8_LATVIAN_CI = 194;
		exports.UTF8_ROMANIAN_CI = 195;
		exports.UTF8_SLOVENIAN_CI = 196;
		exports.UTF8_POLISH_CI = 197;
		exports.UTF8_ESTONIAN_CI = 198;
		exports.UTF8_SPANISH_CI = 199;
		exports.UTF8_SWEDISH_CI = 200;
		exports.UTF8_TURKISH_CI = 201;
		exports.UTF8_CZECH_CI = 202;
		exports.UTF8_DANISH_CI = 203;
		exports.UTF8_LITHUANIAN_CI = 204;
		exports.UTF8_SLOVAK_CI = 205;
		exports.UTF8_SPANISH2_CI = 206;
		exports.UTF8_ROMAN_CI = 207;
		exports.UTF8_PERSIAN_CI = 208;
		exports.UTF8_ESPERANTO_CI = 209;
		exports.UTF8_HUNGARIAN_CI = 210;
		exports.UTF8_SINHALA_CI = 211;
		exports.UTF8_GERMAN2_CI = 212;
		exports.UTF8_CROATIAN_CI = 213;
		exports.UTF8_UNICODE_520_CI = 214;
		exports.UTF8_VIETNAMESE_CI = 215;
		exports.UTF8_GENERAL_MYSQL500_CI = 223;
		exports.UTF8MB4_UNICODE_CI = 224;
		exports.UTF8MB4_ICELANDIC_CI = 225;
		exports.UTF8MB4_LATVIAN_CI = 226;
		exports.UTF8MB4_ROMANIAN_CI = 227;
		exports.UTF8MB4_SLOVENIAN_CI = 228;
		exports.UTF8MB4_POLISH_CI = 229;
		exports.UTF8MB4_ESTONIAN_CI = 230;
		exports.UTF8MB4_SPANISH_CI = 231;
		exports.UTF8MB4_SWEDISH_CI = 232;
		exports.UTF8MB4_TURKISH_CI = 233;
		exports.UTF8MB4_CZECH_CI = 234;
		exports.UTF8MB4_DANISH_CI = 235;
		exports.UTF8MB4_LITHUANIAN_CI = 236;
		exports.UTF8MB4_SLOVAK_CI = 237;
		exports.UTF8MB4_SPANISH2_CI = 238;
		exports.UTF8MB4_ROMAN_CI = 239;
		exports.UTF8MB4_PERSIAN_CI = 240;
		exports.UTF8MB4_ESPERANTO_CI = 241;
		exports.UTF8MB4_HUNGARIAN_CI = 242;
		exports.UTF8MB4_SINHALA_CI = 243;
		exports.UTF8MB4_GERMAN2_CI = 244;
		exports.UTF8MB4_CROATIAN_CI = 245;
		exports.UTF8MB4_UNICODE_520_CI = 246;
		exports.UTF8MB4_VIETNAMESE_CI = 247;
		exports.GB18030_CHINESE_CI = 248;
		exports.GB18030_BIN = 249;
		exports.GB18030_UNICODE_520_CI = 250;
		exports.UTF8_GENERAL50_CI = 253; // deprecated
		exports.UTF8MB4_0900_AI_CI = 255;
		exports.UTF8MB4_DE_PB_0900_AI_CI = 256;
		exports.UTF8MB4_IS_0900_AI_CI = 257;
		exports.UTF8MB4_LV_0900_AI_CI = 258;
		exports.UTF8MB4_RO_0900_AI_CI = 259;
		exports.UTF8MB4_SL_0900_AI_CI = 260;
		exports.UTF8MB4_PL_0900_AI_CI = 261;
		exports.UTF8MB4_ET_0900_AI_CI = 262;
		exports.UTF8MB4_ES_0900_AI_CI = 263;
		exports.UTF8MB4_SV_0900_AI_CI = 264;
		exports.UTF8MB4_TR_0900_AI_CI = 265;
		exports.UTF8MB4_CS_0900_AI_CI = 266;
		exports.UTF8MB4_DA_0900_AI_CI = 267;
		exports.UTF8MB4_LT_0900_AI_CI = 268;
		exports.UTF8MB4_SK_0900_AI_CI = 269;
		exports.UTF8MB4_ES_TRAD_0900_AI_CI = 270;
		exports.UTF8MB4_LA_0900_AI_CI = 271;
		exports.UTF8MB4_EO_0900_AI_CI = 273;
		exports.UTF8MB4_HU_0900_AI_CI = 274;
		exports.UTF8MB4_HR_0900_AI_CI = 275;
		exports.UTF8MB4_VI_0900_AI_CI = 277;
		exports.UTF8MB4_0900_AS_CS = 278;
		exports.UTF8MB4_DE_PB_0900_AS_CS = 279;
		exports.UTF8MB4_IS_0900_AS_CS = 280;
		exports.UTF8MB4_LV_0900_AS_CS = 281;
		exports.UTF8MB4_RO_0900_AS_CS = 282;
		exports.UTF8MB4_SL_0900_AS_CS = 283;
		exports.UTF8MB4_PL_0900_AS_CS = 284;
		exports.UTF8MB4_ET_0900_AS_CS = 285;
		exports.UTF8MB4_ES_0900_AS_CS = 286;
		exports.UTF8MB4_SV_0900_AS_CS = 287;
		exports.UTF8MB4_TR_0900_AS_CS = 288;
		exports.UTF8MB4_CS_0900_AS_CS = 289;
		exports.UTF8MB4_DA_0900_AS_CS = 290;
		exports.UTF8MB4_LT_0900_AS_CS = 291;
		exports.UTF8MB4_SK_0900_AS_CS = 292;
		exports.UTF8MB4_ES_TRAD_0900_AS_CS = 293;
		exports.UTF8MB4_LA_0900_AS_CS = 294;
		exports.UTF8MB4_EO_0900_AS_CS = 296;
		exports.UTF8MB4_HU_0900_AS_CS = 297;
		exports.UTF8MB4_HR_0900_AS_CS = 298;
		exports.UTF8MB4_VI_0900_AS_CS = 300;
		exports.UTF8MB4_JA_0900_AS_CS = 303;
		exports.UTF8MB4_JA_0900_AS_CS_KS = 304;
		exports.UTF8MB4_0900_AS_CI = 305;
		exports.UTF8MB4_RU_0900_AI_CI = 306;
		exports.UTF8MB4_RU_0900_AS_CS = 307;
		exports.UTF8MB4_ZH_0900_AS_CS = 308;
		exports.UTF8MB4_0900_BIN = 309;

		// short aliases
		exports.BIG5 = exports.BIG5_CHINESE_CI;
		exports.DEC8 = exports.DEC8_SWEDISH_CI;
		exports.CP850 = exports.CP850_GENERAL_CI;
		exports.HP8 = exports.HP8_ENGLISH_CI;
		exports.KOI8R = exports.KOI8R_GENERAL_CI;
		exports.LATIN1 = exports.LATIN1_SWEDISH_CI;
		exports.LATIN2 = exports.LATIN2_GENERAL_CI;
		exports.SWE7 = exports.SWE7_SWEDISH_CI;
		exports.ASCII = exports.ASCII_GENERAL_CI;
		exports.UJIS = exports.UJIS_JAPANESE_CI;
		exports.SJIS = exports.SJIS_JAPANESE_CI;
		exports.HEBREW = exports.HEBREW_GENERAL_CI;
		exports.TIS620 = exports.TIS620_THAI_CI;
		exports.EUCKR = exports.EUCKR_KOREAN_CI;
		exports.KOI8U = exports.KOI8U_GENERAL_CI;
		exports.GB2312 = exports.GB2312_CHINESE_CI;
		exports.GREEK = exports.GREEK_GENERAL_CI;
		exports.CP1250 = exports.CP1250_GENERAL_CI;
		exports.GBK = exports.GBK_CHINESE_CI;
		exports.LATIN5 = exports.LATIN5_TURKISH_CI;
		exports.ARMSCII8 = exports.ARMSCII8_GENERAL_CI;
		exports.UTF8 = exports.UTF8_GENERAL_CI;
		exports.UCS2 = exports.UCS2_GENERAL_CI;
		exports.CP866 = exports.CP866_GENERAL_CI;
		exports.KEYBCS2 = exports.KEYBCS2_GENERAL_CI;
		exports.MACCE = exports.MACCE_GENERAL_CI;
		exports.MACROMAN = exports.MACROMAN_GENERAL_CI;
		exports.CP852 = exports.CP852_GENERAL_CI;
		exports.LATIN7 = exports.LATIN7_GENERAL_CI;
		exports.UTF8MB4 = exports.UTF8MB4_GENERAL_CI;
		exports.CP1251 = exports.CP1251_GENERAL_CI;
		exports.UTF16 = exports.UTF16_GENERAL_CI;
		exports.UTF16LE = exports.UTF16LE_GENERAL_CI;
		exports.CP1256 = exports.CP1256_GENERAL_CI;
		exports.CP1257 = exports.CP1257_GENERAL_CI;
		exports.UTF32 = exports.UTF32_GENERAL_CI;
		exports.CP932 = exports.CP932_JAPANESE_CI;
		exports.EUCJPMS = exports.EUCJPMS_JAPANESE_CI;
		exports.GB18030 = exports.GB18030_CHINESE_CI;
		exports.GEOSTD8 = exports.GEOSTD8_GENERAL_CI; 
	} (charsets));
	return charsets;
}

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var helpers$4 = {};

/*

  this seems to be not only shorter, but faster than
  string.replace(/\\/g, '\\\\').
            replace(/\u0008/g, '\\b').
            replace(/\t/g, '\\t').
            replace(/\n/g, '\\n').
            replace(/\f/g, '\\f').
            replace(/\r/g, '\\r').
            replace(/'/g, '\\\'').
            replace(/"/g, '\\"');
  or string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
  see http://jsperf.com/string-escape-regexp-vs-json-stringify
  */
function srcEscape(str) {
  return JSON.stringify({
    [str]: 1,
  }).slice(1, -3);
}

helpers$4.srcEscape = srcEscape;

let highlightFn;
let cardinalRecommended = false;
try {
  // the purpose of this is to prevent projects using Webpack from displaying a warning during runtime if cardinal is not a dependency
  const REQUIRE_TERMINATOR = '';
  highlightFn = commonjsRequire(`cardinal${REQUIRE_TERMINATOR}`).highlight;
} catch {
  highlightFn = (text) => {
    if (!cardinalRecommended) {
      console.log('For nicer debug output consider install cardinal@^2.0.0');
      cardinalRecommended = true;
    }
    return text;
  };
}

/**
 * Prints debug message with code frame, will try to use `cardinal` if available.
 */
function printDebugWithCode(msg, code) {
  console.log(`\n\n${msg}:\n`);
  console.log(`${highlightFn(code)}\n`);
}

helpers$4.printDebugWithCode = printDebugWithCode;

/**
 * checks whether the `type` is in the `list`
 */
function typeMatch(type, list, Types) {
  if (Array.isArray(list)) {
    return list.some((t) => type === Types[t]);
  }

  return !!list;
}

helpers$4.typeMatch = typeMatch;

const privateObjectProps = new Set([
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  '__proto__',
]);

helpers$4.privateObjectProps = privateObjectProps;

const fieldEscape = (field, isEval = true) => {
  if (privateObjectProps.has(field)) {
    throw new Error(
      `The field name (${field}) can't be the same as an object's private property.`
    );
  }

  return isEval ? srcEscape(field) : field;
};
helpers$4.fieldEscape = fieldEscape;

const require$$4 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(generateFunction);

const Types$3 = /*@__PURE__*/ requireTypes();
const Charsets$4 = /*@__PURE__*/ requireCharsets();
const helpers$3 = helpers$4;
const genFunc$1 = require$$4;
const parserCache$1 = parser_cache;

const typeNames$3 = [];
for (const t in Types$3) {
  typeNames$3[Types$3[t]] = t;
}

function readCodeFor$1(type, charset, encodingExpr, config, options) {
  const supportBigNumbers = Boolean(
    options.supportBigNumbers || config.supportBigNumbers
  );
  const bigNumberStrings = Boolean(
    options.bigNumberStrings || config.bigNumberStrings
  );
  const timezone = options.timezone || config.timezone;
  const dateStrings = options.dateStrings || config.dateStrings;

  switch (type) {
    case Types$3.TINY:
    case Types$3.SHORT:
    case Types$3.LONG:
    case Types$3.INT24:
    case Types$3.YEAR:
      return 'packet.parseLengthCodedIntNoBigCheck()';
    case Types$3.LONGLONG:
      if (supportBigNumbers && bigNumberStrings) {
        return 'packet.parseLengthCodedIntString()';
      }
      return `packet.parseLengthCodedInt(${supportBigNumbers})`;
    case Types$3.FLOAT:
    case Types$3.DOUBLE:
      return 'packet.parseLengthCodedFloat()';
    case Types$3.NULL:
      return 'packet.readLengthCodedNumber()';
    case Types$3.DECIMAL:
    case Types$3.NEWDECIMAL:
      if (config.decimalNumbers) {
        return 'packet.parseLengthCodedFloat()';
      }
      return 'packet.readLengthCodedString("ascii")';
    case Types$3.DATE:
      if (helpers$3.typeMatch(type, dateStrings, Types$3)) {
        return 'packet.readLengthCodedString("ascii")';
      }
      return `packet.parseDate(${helpers$3.srcEscape(timezone)})`;
    case Types$3.DATETIME:
    case Types$3.TIMESTAMP:
      if (helpers$3.typeMatch(type, dateStrings, Types$3)) {
        return 'packet.readLengthCodedString("ascii")';
      }
      return `packet.parseDateTime(${helpers$3.srcEscape(timezone)})`;
    case Types$3.TIME:
      return 'packet.readLengthCodedString("ascii")';
    case Types$3.GEOMETRY:
      return 'packet.parseGeometryValue()';
    case Types$3.VECTOR:
      return 'packet.parseVector()';
    case Types$3.JSON:
      // Since for JSON columns mysql always returns charset 63 (BINARY),
      // we have to handle it according to JSON specs and use "utf8",
      // see https://github.com/sidorares/node-mysql2/issues/409
      return config.jsonStrings
        ? 'packet.readLengthCodedString("utf8")'
        : 'JSON.parse(packet.readLengthCodedString("utf8"))';
    default:
      if (charset === Charsets$4.BINARY) {
        return 'packet.readLengthCodedBuffer()';
      }
      return `packet.readLengthCodedString(${encodingExpr})`;
  }
}

function compile$1(fields, options, config) {
  // use global typeCast if current query doesn't specify one
  if (
    typeof config.typeCast === 'function' &&
    typeof options.typeCast !== 'function'
  ) {
    options.typeCast = config.typeCast;
  }

  function wrap(field, _this) {
    return {
      type: typeNames$3[field.columnType],
      length: field.columnLength,
      db: field.schema,
      table: field.table,
      name: field.name,
      string: function (encoding = field.encoding) {
        if (field.columnType === Types$3.JSON && encoding === field.encoding) {
          // Since for JSON columns mysql always returns charset 63 (BINARY),
          // we have to handle it according to JSON specs and use "utf8",
          // see https://github.com/sidorares/node-mysql2/issues/1661
          console.warn(
            `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
          );
        }

        return _this.packet.readLengthCodedString(encoding);
      },
      buffer: function () {
        return _this.packet.readLengthCodedBuffer();
      },
      geometry: function () {
        return _this.packet.parseGeometryValue();
      },
    };
  }

  const parserFn = genFunc$1();

  parserFn('(function () {')('return class TextRow {');

  // constructor method
  parserFn('constructor(fields) {');
  // node-mysql typeCast compatibility wrapper
  // see https://github.com/mysqljs/mysql/blob/96fdd0566b654436624e2375c7b6604b1f50f825/lib/protocol/packets/Field.js
  if (typeof options.typeCast === 'function') {
    parserFn('const _this = this;');
    parserFn('for(let i=0; i<fields.length; ++i) {');
    parserFn('this[`wrap${i}`] = wrap(fields[i], _this);');
    parserFn('}');
  }
  parserFn('}');

  // next method
  parserFn('next(packet, fields, options) {');
  parserFn('this.packet = packet;');
  if (options.rowsAsArray) {
    parserFn(`const result = new Array(${fields.length});`);
  } else {
    parserFn('const result = {};');
  }

  const resultTables = {};
  let resultTablesArray = [];

  if (options.nestTables === true) {
    for (let i = 0; i < fields.length; i++) {
      resultTables[fields[i].table] = 1;
    }
    resultTablesArray = Object.keys(resultTables);
    for (let i = 0; i < resultTablesArray.length; i++) {
      parserFn(`result[${helpers$3.fieldEscape(resultTablesArray[i])}] = {};`);
    }
  }

  let lvalue = '';
  let fieldName = '';
  let tableName = '';
  for (let i = 0; i < fields.length; i++) {
    fieldName = helpers$3.fieldEscape(fields[i].name);
    // parserFn(`// ${fieldName}: ${typeNames[fields[i].columnType]}`);

    if (typeof options.nestTables === 'string') {
      lvalue = `result[${helpers$3.fieldEscape(fields[i].table + options.nestTables + fields[i].name)}]`;
    } else if (options.nestTables === true) {
      tableName = helpers$3.fieldEscape(fields[i].table);

      parserFn(`if (!result[${tableName}]) result[${tableName}] = {};`);
      lvalue = `result[${tableName}][${fieldName}]`;
    } else if (options.rowsAsArray) {
      lvalue = `result[${i.toString(10)}]`;
    } else {
      lvalue = `result[${fieldName}]`;
    }
    if (options.typeCast === false) {
      parserFn(`${lvalue} = packet.readLengthCodedBuffer();`);
    } else {
      const encodingExpr = `fields[${i}].encoding`;
      const readCode = readCodeFor$1(
        fields[i].columnType,
        fields[i].characterSet,
        encodingExpr,
        config,
        options
      );
      if (typeof options.typeCast === 'function') {
        parserFn(
          `${lvalue} = options.typeCast(this.wrap${i}, function() { return ${readCode} });`
        );
      } else {
        parserFn(`${lvalue} = ${readCode};`);
      }
    }
  }

  parserFn('return result;');
  parserFn('}');
  parserFn('};')('})()');

  if (config.debug) {
    helpers$3.printDebugWithCode(
      'Compiled text protocol row parser',
      parserFn.toString()
    );
  }
  if (typeof options.typeCast === 'function') {
    return parserFn.toFunction({ wrap });
  }
  return parserFn.toFunction();
}

function getTextParser$2(fields, options, config) {
  return parserCache$1.getParser('text', fields, options, config, compile$1);
}

var text_parser = getTextParser$2;

const Types$2 = /*@__PURE__*/ requireTypes();
const Charsets$3 = /*@__PURE__*/ requireCharsets();
const helpers$2 = helpers$4;

const typeNames$2 = [];
for (const t in Types$2) {
  typeNames$2[Types$2[t]] = t;
}

function readField({ packet, type, charset, encoding, config, options }) {
  const supportBigNumbers = Boolean(
    options.supportBigNumbers || config.supportBigNumbers
  );
  const bigNumberStrings = Boolean(
    options.bigNumberStrings || config.bigNumberStrings
  );
  const timezone = options.timezone || config.timezone;
  const dateStrings = options.dateStrings || config.dateStrings;

  switch (type) {
    case Types$2.TINY:
    case Types$2.SHORT:
    case Types$2.LONG:
    case Types$2.INT24:
    case Types$2.YEAR:
      return packet.parseLengthCodedIntNoBigCheck();
    case Types$2.LONGLONG:
      if (supportBigNumbers && bigNumberStrings) {
        return packet.parseLengthCodedIntString();
      }
      return packet.parseLengthCodedInt(supportBigNumbers);
    case Types$2.FLOAT:
    case Types$2.DOUBLE:
      return packet.parseLengthCodedFloat();
    case Types$2.NULL:
    case Types$2.DECIMAL:
    case Types$2.NEWDECIMAL:
      if (config.decimalNumbers) {
        return packet.parseLengthCodedFloat();
      }
      return packet.readLengthCodedString('ascii');
    case Types$2.DATE:
      if (helpers$2.typeMatch(type, dateStrings, Types$2)) {
        return packet.readLengthCodedString('ascii');
      }
      return packet.parseDate(timezone);
    case Types$2.DATETIME:
    case Types$2.TIMESTAMP:
      if (helpers$2.typeMatch(type, dateStrings, Types$2)) {
        return packet.readLengthCodedString('ascii');
      }
      return packet.parseDateTime(timezone);
    case Types$2.TIME:
      return packet.readLengthCodedString('ascii');
    case Types$2.GEOMETRY:
      return packet.parseGeometryValue();
    case Types$2.VECTOR:
      return packet.parseVector();
    case Types$2.JSON:
      // Since for JSON columns mysql always returns charset 63 (BINARY),
      // we have to handle it according to JSON specs and use "utf8",
      // see https://github.com/sidorares/node-mysql2/issues/409
      return config.jsonStrings
        ? packet.readLengthCodedString('utf8')
        : JSON.parse(packet.readLengthCodedString('utf8'));
    default:
      if (charset === Charsets$3.BINARY) {
        return packet.readLengthCodedBuffer();
      }
      return packet.readLengthCodedString(encoding);
  }
}

function createTypecastField(field, packet) {
  return {
    type: typeNames$2[field.columnType],
    length: field.columnLength,
    db: field.schema,
    table: field.table,
    name: field.name,
    string: function (encoding = field.encoding) {
      if (field.columnType === Types$2.JSON && encoding === field.encoding) {
        // Since for JSON columns mysql always returns charset 63 (BINARY),
        // we have to handle it according to JSON specs and use "utf8",
        // see https://github.com/sidorares/node-mysql2/issues/1661
        console.warn(
          `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
        );
      }
      return packet.readLengthCodedString(encoding);
    },
    buffer: function () {
      return packet.readLengthCodedBuffer();
    },
    geometry: function () {
      return packet.parseGeometryValue();
    },
  };
}

function getTextParser$1(_fields, _options, config) {
  return {
    next(packet, fields, options) {
      const result = options.rowsAsArray ? [] : {};
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const typeCast = options.typeCast ? options.typeCast : config.typeCast;
        const next = () =>
          readField({
            packet,
            type: field.columnType,
            encoding: field.encoding,
            charset: field.characterSet,
            config,
            options,
          });

        let value;

        if (options.typeCast === false) {
          value = packet.readLengthCodedBuffer();
        } else if (typeof typeCast === 'function') {
          value = typeCast(createTypecastField(field, packet), next);
        } else {
          value = next();
        }

        if (options.rowsAsArray) {
          result.push(value);
        } else if (typeof options.nestTables === 'string') {
          result[
            `${helpers$2.fieldEscape(field.table, false)}${options.nestTables}${helpers$2.fieldEscape(field.name, false)}`
          ] = value;
        } else if (options.nestTables) {
          const tableName = helpers$2.fieldEscape(field.table, false);
          if (!result[tableName]) {
            result[tableName] = {};
          }
          result[tableName][helpers$2.fieldEscape(field.name, false)] = value;
        } else {
          result[helpers$2.fieldEscape(field.name, false)] = value;
        }
      }

      return result;
    },
  };
}

var static_text_parser = getTextParser$1;

const process$4 = require$$0$6;
const Timers$1 = require$$2$1;

const Readable$1 = require$$4$2.Readable;

const Command$9 = command;
const Packets$8 = packetsExports;
const getTextParser = text_parser;
const staticParser = static_text_parser;
const ServerStatus = server_status;

const EmptyPacket = new Packets$8.Packet(0, Buffer.allocUnsafe(4), 0, 4);

// http://dev.mysql.com/doc/internals/en/com-query.html
let Query$2 = class Query extends Command$9 {
  constructor(options, callback) {
    super();
    this.sql = options.sql;
    this.values = options.values;
    this._queryOptions = options;
    this.namedPlaceholders = options.namedPlaceholders || false;
    this.onResult = callback;
    this.timeout = options.timeout;
    this.queryTimeout = null;
    this._fieldCount = 0;
    this._rowParser = null;
    this._fields = [];
    this._rows = [];
    this._receivedFieldsCount = 0;
    this._resultIndex = 0;
    this._localStream = null;
    this._unpipeStream = function () {};
    this._streamFactory = options.infileStreamFactory;
    this._connection = null;
  }

  then() {
    const err =
      "You have tried to call .then(), .catch(), or invoked await on the result of query that is not a promise, which is a programming error. Try calling con.promise().query(), or require('mysql2/promise') instead of 'mysql2' for a promise-compatible version of the query interface. To learn how to use async/await or Promises check out documentation at https://sidorares.github.io/node-mysql2/docs#using-promise-wrapper, or the mysql2 documentation at https://sidorares.github.io/node-mysql2/docs/documentation/promise-wrapper";

    console.log(err);
    throw new Error(err);
  }

  /* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
  start(_packet, connection) {
    if (connection.config.debug) {
      console.log('        Sending query command: %s', this.sql);
    }
    this._connection = connection;
    this.options = Object.assign({}, connection.config, this._queryOptions);
    this._setTimeout();

    const clientFlags =
      connection.config.clientFlags & (connection.serverCapabilityFlags || 0);
    const cmdPacket = new Packets$8.Query(
      this.sql,
      connection.config.charsetNumber,
      this._queryOptions.attributes,
      clientFlags
    );
    connection.writePacket(cmdPacket.toPacket(1));
    return Query.prototype.resultsetHeader;
  }

  done() {
    this._unpipeStream();
    // if all ready timeout, return null directly
    if (this.timeout && !this.queryTimeout) {
      return null;
    }
    // else clear timer
    if (this.queryTimeout) {
      Timers$1.clearTimeout(this.queryTimeout);
      this.queryTimeout = null;
    }
    if (this.onResult) {
      let rows, fields;
      if (this._resultIndex === 0) {
        rows = this._rows[0];
        fields = this._fields[0];
      } else {
        rows = this._rows;
        fields = this._fields;
      }
      if (fields) {
        process$4.nextTick(() => {
          this.onResult(null, rows, fields);
        });
      } else {
        process$4.nextTick(() => {
          this.onResult(null, rows);
        });
      }
    }
    return null;
  }

  doneInsert(rs) {
    if (this._localStreamError) {
      if (this.onResult) {
        this.onResult(this._localStreamError, rs);
      } else {
        this.emit('error', this._localStreamError);
      }
      return null;
    }
    this._rows.push(rs);
    this._fields.push(void 0);
    this.emit('fields', void 0);
    this.emit('result', rs);
    if (rs.serverStatus & ServerStatus.SERVER_MORE_RESULTS_EXISTS) {
      this._resultIndex++;
      return this.resultsetHeader;
    }
    return this.done();
  }

  resultsetHeader(packet, connection) {
    const rs = new Packets$8.ResultSetHeader(packet, connection);
    this._fieldCount = rs.fieldCount;
    if (connection.config.debug) {
      console.log(
        `        Resultset header received, expecting ${rs.fieldCount} column definition packets`
      );
    }
    if (this._fieldCount === 0) {
      return this.doneInsert(rs);
    }
    if (this._fieldCount === null) {
      return this._streamLocalInfile(connection, rs.infileName);
    }
    this._receivedFieldsCount = 0;
    this._rows.push([]);
    this._fields.push([]);
    return this.readField;
  }

  _streamLocalInfile(connection, path) {
    if (this._streamFactory) {
      this._localStream = this._streamFactory(path);
    } else {
      this._localStreamError = new Error(
        `As a result of LOCAL INFILE command server wants to read ${path} file, but as of v2.0 you must provide streamFactory option returning ReadStream.`
      );
      connection.writePacket(EmptyPacket);
      return this.infileOk;
    }

    const onConnectionError = () => {
      this._unpipeStream();
    };
    const onDrain = () => {
      this._localStream.resume();
    };
    const onPause = () => {
      this._localStream.pause();
    };
    const onData = function (data) {
      const dataWithHeader = Buffer.allocUnsafe(data.length + 4);
      data.copy(dataWithHeader, 4);
      connection.writePacket(
        new Packets$8.Packet(0, dataWithHeader, 0, dataWithHeader.length)
      );
    };
    const onEnd = () => {
      connection.removeListener('error', onConnectionError);
      connection.writePacket(EmptyPacket);
    };
    const onError = (err) => {
      this._localStreamError = err;
      connection.removeListener('error', onConnectionError);
      connection.writePacket(EmptyPacket);
    };
    this._unpipeStream = () => {
      connection.stream.removeListener('pause', onPause);
      connection.stream.removeListener('drain', onDrain);
      this._localStream.removeListener('data', onData);
      this._localStream.removeListener('end', onEnd);
      this._localStream.removeListener('error', onError);
    };
    connection.stream.on('pause', onPause);
    connection.stream.on('drain', onDrain);
    this._localStream.on('data', onData);
    this._localStream.on('end', onEnd);
    this._localStream.on('error', onError);
    connection.once('error', onConnectionError);
    return this.infileOk;
  }

  readField(packet, connection) {
    this._receivedFieldsCount++;
    // Often there is much more data in the column definition than in the row itself
    // If you set manually _fields[0] to array of ColumnDefinition's (from previous call)
    // you can 'cache' result of parsing. Field packets still received, but ignored in that case
    // this is the reason _receivedFieldsCount exist (otherwise we could just use current length of fields array)
    if (this._fields[this._resultIndex].length !== this._fieldCount) {
      const field = new Packets$8.ColumnDefinition(
        packet,
        connection.clientEncoding
      );
      this._fields[this._resultIndex].push(field);
      if (connection.config.debug) {
        console.log('        Column definition:');
        console.log(`          name: ${field.name}`);
        console.log(`          type: ${field.columnType}`);
        console.log(`         flags: ${field.flags}`);
      }
    }
    // last field received
    if (this._receivedFieldsCount === this._fieldCount) {
      const fields = this._fields[this._resultIndex];
      this.emit('fields', fields);
      if (this.options.disableEval) {
        this._rowParser = staticParser(fields, this.options, connection.config);
      } else {
        this._rowParser = new (getTextParser(
          fields,
          this.options,
          connection.config
        ))(fields);
      }
      return Query.prototype.fieldsEOF;
    }
    return Query.prototype.readField;
  }

  fieldsEOF(packet, connection) {
    // check EOF
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet');
    }
    return this.row;
  }

  row(packet, _connection) {
    if (packet.isEOF()) {
      const status = packet.eofStatusFlags();
      const moreResults = status & ServerStatus.SERVER_MORE_RESULTS_EXISTS;
      if (moreResults) {
        this._resultIndex++;
        return Query.prototype.resultsetHeader;
      }
      return this.done();
    }
    let row;
    try {
      row = this._rowParser.next(
        packet,
        this._fields[this._resultIndex],
        this.options
      );
    } catch (err) {
      this._localStreamError = err;
      return this.doneInsert(null);
    }
    if (this.onResult) {
      this._rows[this._resultIndex].push(row);
    } else {
      this.emit('result', row, this._resultIndex);
    }
    return Query.prototype.row;
  }

  infileOk(packet, connection) {
    const rs = new Packets$8.ResultSetHeader(packet, connection);
    return this.doneInsert(rs);
  }

  stream(options) {
    options = options || Object.create(null);
    options.objectMode = true;

    const stream = new Readable$1({
      ...options,
      emitClose: true,
      autoDestroy: true,
      read: () => {
        this._connection && this._connection.resume();
      },
    });

    // Prevent a breaking change for users that rely on `end` event
    stream.once('close', () => {
      if (!stream.readableEnded) {
        stream.emit('end');
      }
    });

    const onResult = (row, index) => {
      if (stream.destroyed) return;

      if (!stream.push(row)) {
        this._connection && this._connection.pause();
      }

      stream.emit('result', row, index); // replicate old emitter
    };

    const onFields = (fields) => {
      if (stream.destroyed) return;

      stream.emit('fields', fields); // replicate old emitter
    };

    const onEnd = () => {
      if (stream.destroyed) return;

      stream.push(null); // pushing null, indicating EOF
    };

    const onError = (err) => {
      stream.destroy(err);
    };

    stream._destroy = (err, cb) => {
      this._connection && this._connection.resume();

      this.removeListener('result', onResult);
      this.removeListener('fields', onFields);
      this.removeListener('end', onEnd);
      this.removeListener('error', onError);

      cb(err); // Pass on any errors
    };

    this.on('result', onResult);
    this.on('fields', onFields);
    this.on('end', onEnd);
    this.on('error', onError);

    return stream;
  }

  _setTimeout() {
    if (this.timeout) {
      const timeoutHandler = this._handleTimeoutError.bind(this);
      this.queryTimeout = Timers$1.setTimeout(timeoutHandler, this.timeout);
    }
  }

  _handleTimeoutError() {
    if (this.queryTimeout) {
      Timers$1.clearTimeout(this.queryTimeout);
      this.queryTimeout = null;
    }

    const err = new Error('Query inactivity timeout');
    err.errorno = 'PROTOCOL_SEQUENCE_TIMEOUT';
    err.code = 'PROTOCOL_SEQUENCE_TIMEOUT';
    err.syscall = 'query';

    if (this.onResult) {
      this.onResult(err);
    } else {
      this.emit('error', err);
    }
  }
};

Query$2.prototype.catch = Query$2.prototype.then;

var query = Query$2;

const Command$8 = command;
const Packets$7 = packetsExports;

let CloseStatement$1 = class CloseStatement extends Command$8 {
  constructor(id) {
    super();
    this.id = id;
  }

  start(packet, connection) {
    connection.writePacket(new Packets$7.CloseStatement(this.id).toPacket(1));
    return null;
  }
};

var close_statement = CloseStatement$1;

const FieldFlags$1 = /*@__PURE__*/ requireField_flags();
const Charsets$2 = /*@__PURE__*/ requireCharsets();
const Types$1 = /*@__PURE__*/ requireTypes();
const helpers$1 = helpers$4;
const genFunc = require$$4;
const parserCache = parser_cache;
const typeNames$1 = [];
for (const t in Types$1) {
  typeNames$1[Types$1[t]] = t;
}

function readCodeFor(field, config, options, fieldNum) {
  const supportBigNumbers = Boolean(
    options.supportBigNumbers || config.supportBigNumbers
  );
  const bigNumberStrings = Boolean(
    options.bigNumberStrings || config.bigNumberStrings
  );
  const timezone = options.timezone || config.timezone;
  const dateStrings = options.dateStrings || config.dateStrings;
  const unsigned = field.flags & FieldFlags$1.UNSIGNED;
  switch (field.columnType) {
    case Types$1.TINY:
      return unsigned ? 'packet.readInt8();' : 'packet.readSInt8();';
    case Types$1.SHORT:
      return unsigned ? 'packet.readInt16();' : 'packet.readSInt16();';
    case Types$1.LONG:
    case Types$1.INT24: // in binary protocol int24 is encoded in 4 bytes int32
      return unsigned ? 'packet.readInt32();' : 'packet.readSInt32();';
    case Types$1.YEAR:
      return 'packet.readInt16()';
    case Types$1.FLOAT:
      return 'packet.readFloat();';
    case Types$1.DOUBLE:
      return 'packet.readDouble();';
    case Types$1.NULL:
      return 'null;';
    case Types$1.DATE:
    case Types$1.DATETIME:
    case Types$1.TIMESTAMP:
    case Types$1.NEWDATE:
      if (helpers$1.typeMatch(field.columnType, dateStrings, Types$1)) {
        return `packet.readDateTimeString(${parseInt(field.decimals, 10)}, ${null}, ${field.columnType});`;
      }
      return `packet.readDateTime(${helpers$1.srcEscape(timezone)});`;
    case Types$1.TIME:
      return 'packet.readTimeString()';
    case Types$1.DECIMAL:
    case Types$1.NEWDECIMAL:
      if (config.decimalNumbers) {
        return 'packet.parseLengthCodedFloat();';
      }
      return 'packet.readLengthCodedString("ascii");';
    case Types$1.GEOMETRY:
      return 'packet.parseGeometryValue();';
    case Types$1.VECTOR:
      return 'packet.parseVector()';
    case Types$1.JSON:
      // Since for JSON columns mysql always returns charset 63 (BINARY),
      // we have to handle it according to JSON specs and use "utf8",
      // see https://github.com/sidorares/node-mysql2/issues/409
      return config.jsonStrings
        ? 'packet.readLengthCodedString("utf8")'
        : 'JSON.parse(packet.readLengthCodedString("utf8"));';
    case Types$1.LONGLONG:
      if (!supportBigNumbers) {
        return unsigned
          ? 'packet.readInt64JSNumber();'
          : 'packet.readSInt64JSNumber();';
      }
      if (bigNumberStrings) {
        return unsigned
          ? 'packet.readInt64String();'
          : 'packet.readSInt64String();';
      }
      return unsigned ? 'packet.readInt64();' : 'packet.readSInt64();';

    default:
      if (field.characterSet === Charsets$2.BINARY) {
        return 'packet.readLengthCodedBuffer();';
      }
      return `packet.readLengthCodedString(fields[${fieldNum}].encoding)`;
  }
}

function compile(fields, options, config) {
  const parserFn = genFunc();
  const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);

  function wrap(field, packet) {
    return {
      type: typeNames$1[field.columnType],
      length: field.columnLength,
      db: field.schema,
      table: field.table,
      name: field.name,
      string: function (encoding = field.encoding) {
        if (field.columnType === Types$1.JSON && encoding === field.encoding) {
          // Since for JSON columns mysql always returns charset 63 (BINARY),
          // we have to handle it according to JSON specs and use "utf8",
          // see https://github.com/sidorares/node-mysql2/issues/1661
          console.warn(
            `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
          );
        }

        if (
          [Types$1.DATETIME, Types$1.NEWDATE, Types$1.TIMESTAMP, Types$1.DATE].includes(
            field.columnType
          )
        ) {
          return packet.readDateTimeString(
            parseInt(field.decimals, 10),
            ' ',
            field.columnType
          );
        }

        if (field.columnType === Types$1.TINY) {
          const unsigned = field.flags & FieldFlags$1.UNSIGNED;

          return String(unsigned ? packet.readInt8() : packet.readSInt8());
        }

        if (field.columnType === Types$1.TIME) {
          return packet.readTimeString();
        }

        return packet.readLengthCodedString(encoding);
      },
      buffer: function () {
        return packet.readLengthCodedBuffer();
      },
      geometry: function () {
        return packet.parseGeometryValue();
      },
    };
  }

  parserFn('(function(){');
  parserFn('return class BinaryRow {');
  parserFn('constructor() {');
  parserFn('}');

  parserFn('next(packet, fields, options) {');
  if (options.rowsAsArray) {
    parserFn(`const result = new Array(${fields.length});`);
  } else {
    parserFn('const result = {};');
  }

  // Global typeCast
  if (
    typeof config.typeCast === 'function' &&
    typeof options.typeCast !== 'function'
  ) {
    options.typeCast = config.typeCast;
  }

  parserFn('packet.readInt8();'); // status byte
  for (let i = 0; i < nullBitmapLength; ++i) {
    parserFn(`const nullBitmaskByte${i} = packet.readInt8();`);
  }

  let lvalue = '';
  let currentFieldNullBit = 4;
  let nullByteIndex = 0;
  let fieldName = '';
  let tableName = '';

  for (let i = 0; i < fields.length; i++) {
    fieldName = helpers$1.fieldEscape(fields[i].name);
    // parserFn(`// ${fieldName}: ${typeNames[fields[i].columnType]}`);

    if (typeof options.nestTables === 'string') {
      lvalue = `result[${helpers$1.fieldEscape(fields[i].table + options.nestTables + fields[i].name)}]`;
    } else if (options.nestTables === true) {
      tableName = helpers$1.fieldEscape(fields[i].table);

      parserFn(`if (!result[${tableName}]) result[${tableName}] = {};`);
      lvalue = `result[${tableName}][${fieldName}]`;
    } else if (options.rowsAsArray) {
      lvalue = `result[${i.toString(10)}]`;
    } else {
      lvalue = `result[${fieldName}]`;
    }

    parserFn(`if (nullBitmaskByte${nullByteIndex} & ${currentFieldNullBit}) `);
    parserFn(`${lvalue} = null;`);
    parserFn('else {');

    if (options.typeCast === false) {
      parserFn(`${lvalue} = packet.readLengthCodedBuffer();`);
    } else {
      const fieldWrapperVar = `fieldWrapper${i}`;
      parserFn(`const ${fieldWrapperVar} = wrap(fields[${i}], packet);`);
      const readCode = readCodeFor(fields[i], config, options, i);

      if (typeof options.typeCast === 'function') {
        parserFn(
          `${lvalue} = options.typeCast(${fieldWrapperVar}, function() { return ${readCode} });`
        );
      } else {
        parserFn(`${lvalue} = ${readCode};`);
      }
    }
    parserFn('}');

    currentFieldNullBit *= 2;
    if (currentFieldNullBit === 0x100) {
      currentFieldNullBit = 1;
      nullByteIndex++;
    }
  }

  parserFn('return result;');
  parserFn('}');
  parserFn('};')('})()');

  if (config.debug) {
    helpers$1.printDebugWithCode(
      'Compiled binary protocol row parser',
      parserFn.toString()
    );
  }
  return parserFn.toFunction({ wrap });
}

function getBinaryParser$2(fields, options, config) {
  return parserCache.getParser('binary', fields, options, config, compile);
}

var binary_parser = getBinaryParser$2;

const FieldFlags = /*@__PURE__*/ requireField_flags();
const Charsets$1 = /*@__PURE__*/ requireCharsets();
const Types = /*@__PURE__*/ requireTypes();
const helpers = helpers$4;

const typeNames = [];
for (const t in Types) {
  typeNames[Types[t]] = t;
}

function getBinaryParser$1(fields, _options, config) {
  function readCode(field, config, options, fieldNum, packet) {
    const supportBigNumbers = Boolean(
      options.supportBigNumbers || config.supportBigNumbers
    );
    const bigNumberStrings = Boolean(
      options.bigNumberStrings || config.bigNumberStrings
    );
    const timezone = options.timezone || config.timezone;
    const dateStrings = options.dateStrings || config.dateStrings;
    const unsigned = field.flags & FieldFlags.UNSIGNED;

    switch (field.columnType) {
      case Types.TINY:
        return unsigned ? packet.readInt8() : packet.readSInt8();
      case Types.SHORT:
        return unsigned ? packet.readInt16() : packet.readSInt16();
      case Types.LONG:
      case Types.INT24: // in binary protocol int24 is encoded in 4 bytes int32
        return unsigned ? packet.readInt32() : packet.readSInt32();
      case Types.YEAR:
        return packet.readInt16();
      case Types.FLOAT:
        return packet.readFloat();
      case Types.DOUBLE:
        return packet.readDouble();
      case Types.NULL:
        return null;
      case Types.DATE:
      case Types.DATETIME:
      case Types.TIMESTAMP:
      case Types.NEWDATE:
        return helpers.typeMatch(field.columnType, dateStrings, Types)
          ? packet.readDateTimeString(
              parseInt(field.decimals, 10),
              null,
              field.columnType
            )
          : packet.readDateTime(timezone);
      case Types.TIME:
        return packet.readTimeString();
      case Types.DECIMAL:
      case Types.NEWDECIMAL:
        return config.decimalNumbers
          ? packet.parseLengthCodedFloat()
          : packet.readLengthCodedString('ascii');
      case Types.GEOMETRY:
        return packet.parseGeometryValue();
      case Types.VECTOR:
        return packet.parseVector();
      case Types.JSON:
        // Since for JSON columns mysql always returns charset 63 (BINARY),
        // we have to handle it according to JSON specs and use "utf8",
        // see https://github.com/sidorares/node-mysql2/issues/409
        return config.jsonStrings
          ? packet.readLengthCodedString('utf8')
          : JSON.parse(packet.readLengthCodedString('utf8'));
      case Types.LONGLONG:
        if (!supportBigNumbers)
          return unsigned
            ? packet.readInt64JSNumber()
            : packet.readSInt64JSNumber();
        return bigNumberStrings
          ? unsigned
            ? packet.readInt64String()
            : packet.readSInt64String()
          : unsigned
            ? packet.readInt64()
            : packet.readSInt64();
      default:
        return field.characterSet === Charsets$1.BINARY
          ? packet.readLengthCodedBuffer()
          : packet.readLengthCodedString(fields[fieldNum].encoding);
    }
  }

  return class BinaryRow {
    constructor() {}

    next(packet, fields, options) {
      packet.readInt8(); // status byte

      const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);
      const nullBitmaskBytes = new Array(nullBitmapLength);

      for (let i = 0; i < nullBitmapLength; i++) {
        nullBitmaskBytes[i] = packet.readInt8();
      }

      const result = options.rowsAsArray ? new Array(fields.length) : {};
      let currentFieldNullBit = 4;
      let nullByteIndex = 0;

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const typeCast =
          options.typeCast !== undefined ? options.typeCast : config.typeCast;

        let value;
        if (nullBitmaskBytes[nullByteIndex] & currentFieldNullBit) {
          value = null;
        } else if (options.typeCast === false) {
          value = packet.readLengthCodedBuffer();
        } else {
          const next = () => readCode(field, config, options, i, packet);
          value =
            typeof typeCast === 'function'
              ? typeCast(
                  {
                    type: typeNames[field.columnType],
                    length: field.columnLength,
                    db: field.schema,
                    table: field.table,
                    name: field.name,
                    string: function (encoding = field.encoding) {
                      if (
                        field.columnType === Types.JSON &&
                        encoding === field.encoding
                      ) {
                        // Since for JSON columns mysql always returns charset 63 (BINARY),
                        // we have to handle it according to JSON specs and use "utf8",
                        // see https://github.com/sidorares/node-mysql2/issues/1661
                        console.warn(
                          `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
                        );
                      }

                      if (
                        [
                          Types.DATETIME,
                          Types.NEWDATE,
                          Types.TIMESTAMP,
                          Types.DATE,
                        ].includes(field.columnType)
                      ) {
                        return packet.readDateTimeString(
                          parseInt(field.decimals, 10),
                          ' ',
                          field.columnType
                        );
                      }

                      if (field.columnType === Types.TINY) {
                        const unsigned = field.flags & FieldFlags.UNSIGNED;

                        return String(
                          unsigned ? packet.readInt8() : packet.readSInt8()
                        );
                      }

                      if (field.columnType === Types.TIME) {
                        return packet.readTimeString();
                      }

                      return packet.readLengthCodedString(encoding);
                    },
                    buffer: function () {
                      return packet.readLengthCodedBuffer();
                    },
                    geometry: function () {
                      return packet.parseGeometryValue();
                    },
                  },
                  next
                )
              : next();
        }

        if (options.rowsAsArray) {
          result[i] = value;
        } else if (typeof options.nestTables === 'string') {
          const key = helpers.fieldEscape(
            field.table + options.nestTables + field.name,
            false
          );
          result[key] = value;
        } else if (options.nestTables === true) {
          const tableName = helpers.fieldEscape(field.table, false);
          if (!result[tableName]) {
            result[tableName] = {};
          }
          const fieldName = helpers.fieldEscape(field.name, false);
          result[tableName][fieldName] = value;
        } else {
          const key = helpers.fieldEscape(field.name, false);
          result[key] = value;
        }

        currentFieldNullBit *= 2;
        if (currentFieldNullBit === 0x100) {
          currentFieldNullBit = 1;
          nullByteIndex++;
        }
      }

      return result;
    }
  };
}

var static_binary_parser = getBinaryParser$1;

const Command$7 = command;
const Query$1 = query;
const Packets$6 = packetsExports;

const getBinaryParser = binary_parser;
const getStaticBinaryParser = static_binary_parser;

let Execute$2 = class Execute extends Command$7 {
  constructor(options, callback) {
    super();
    this.statement = options.statement;
    this.sql = options.sql;
    this.values = options.values;
    this.onResult = callback;
    this.parameters = options.values;
    this.insertId = 0;
    this.timeout = options.timeout;
    this.queryTimeout = null;
    this._rows = [];
    this._fields = [];
    this._result = [];
    this._fieldCount = 0;
    this._rowParser = null;
    this._executeOptions = options;
    this._resultIndex = 0;
    this._localStream = null;
    this._unpipeStream = function () {};
    this._streamFactory = options.infileStreamFactory;
    this._connection = null;
  }

  buildParserFromFields(fields, connection) {
    if (this.options.disableEval) {
      return getStaticBinaryParser(fields, this.options, connection.config);
    }

    return getBinaryParser(fields, this.options, connection.config);
  }

  start(packet, connection) {
    this._connection = connection;
    this.options = Object.assign({}, connection.config, this._executeOptions);
    this._setTimeout();
    const clientFlags =
      connection.config.clientFlags & (connection.serverCapabilityFlags || 0);
    const executePacket = new Packets$6.Execute(
      this.statement.id,
      this.parameters,
      connection.config.charsetNumber,
      connection.config.timezone,
      this._executeOptions.attributes,
      clientFlags
    );
    //For reasons why this try-catch is here, please see
    // https://github.com/sidorares/node-mysql2/pull/689
    //For additional discussion, see
    // 1. https://github.com/sidorares/node-mysql2/issues/493
    // 2. https://github.com/sidorares/node-mysql2/issues/187
    // 3. https://github.com/sidorares/node-mysql2/issues/480
    try {
      connection.writePacket(executePacket.toPacket(1));
    } catch (error) {
      this.onResult(error);
    }
    return Execute.prototype.resultsetHeader;
  }

  readField(packet, connection) {
    let fields;
    // disabling for now, but would be great to find reliable way to parse fields only once
    // fields reported by prepare can be empty at all or just incorrect - see #169
    //
    // perfomance optimisation: if we already have this field parsed in statement header, use one from header
    // const field = this.statement.columns.length == this._fieldCount ?
    //  this.statement.columns[this._receivedFieldsCount] : new Packets.ColumnDefinition(packet);
    const field = new Packets$6.ColumnDefinition(
      packet,
      connection.clientEncoding
    );
    this._receivedFieldsCount++;
    this._fields[this._resultIndex].push(field);
    if (this._receivedFieldsCount === this._fieldCount) {
      fields = this._fields[this._resultIndex];
      this.emit('fields', fields, this._resultIndex);
      return Execute.prototype.fieldsEOF;
    }
    return Execute.prototype.readField;
  }

  fieldsEOF(packet, connection) {
    // check EOF
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet');
    }
    this._rowParser = new (this.buildParserFromFields(
      this._fields[this._resultIndex],
      connection
    ))();
    return Execute.prototype.row;
  }
};

Execute$2.prototype.done = Query$1.prototype.done;
Execute$2.prototype.doneInsert = Query$1.prototype.doneInsert;
Execute$2.prototype.resultsetHeader = Query$1.prototype.resultsetHeader;
Execute$2.prototype._findOrCreateReadStream =
  Query$1.prototype._findOrCreateReadStream;
Execute$2.prototype._streamLocalInfile = Query$1.prototype._streamLocalInfile;
Execute$2.prototype._setTimeout = Query$1.prototype._setTimeout;
Execute$2.prototype._handleTimeoutError = Query$1.prototype._handleTimeoutError;
Execute$2.prototype.row = Query$1.prototype.row;
Execute$2.prototype.stream = Query$1.prototype.stream;

var execute = Execute$2;

const Packets$5 = packetsExports;
const Command$6 = command;
const CloseStatement = close_statement;
const Execute$1 = execute;

class PreparedStatementInfo {
  constructor(query, id, columns, parameters, connection) {
    this.query = query;
    this.id = id;
    this.columns = columns;
    this.parameters = parameters;
    this.rowParser = null;
    this._connection = connection;
  }

  close() {
    return this._connection.addCommand(new CloseStatement(this.id));
  }

  execute(parameters, callback) {
    if (typeof parameters === 'function') {
      callback = parameters;
      parameters = [];
    }
    return this._connection.addCommand(
      new Execute$1({ statement: this, values: parameters }, callback)
    );
  }
}

let Prepare$1 = class Prepare extends Command$6 {
  constructor(options, callback) {
    super();
    this.query = options.sql;
    this.onResult = callback;
    this.id = 0;
    this.fieldCount = 0;
    this.parameterCount = 0;
    this.fields = [];
    this.parameterDefinitions = [];
    this.options = options;
  }

  start(packet, connection) {
    const Connection = connection.constructor;
    this.key = Connection.statementKey(this.options);
    const statement = connection._statements.get(this.key);
    if (statement) {
      if (this.onResult) {
        this.onResult(null, statement);
      }
      return null;
    }
    const cmdPacket = new Packets$5.PrepareStatement(
      this.query,
      connection.config.charsetNumber,
      this.options.values
    );
    connection.writePacket(cmdPacket.toPacket(1));
    return Prepare.prototype.prepareHeader;
  }

  prepareHeader(packet, connection) {
    const header = new Packets$5.PreparedStatementHeader(packet);
    this.id = header.id;
    this.fieldCount = header.fieldCount;
    this.parameterCount = header.parameterCount;
    if (this.parameterCount > 0) {
      return Prepare.prototype.readParameter;
    }
    if (this.fieldCount > 0) {
      return Prepare.prototype.readField;
    }
    return this.prepareDone(connection);
  }

  readParameter(packet, connection) {
    // there might be scenarios when mysql server reports more parameters than
    // are actually present in the array of parameter definitions.
    // if EOF packet is received we switch to "read fields" state if there are
    // any fields reported by the server, otherwise we finish the command.
    if (packet.isEOF()) {
      if (this.fieldCount > 0) {
        return Prepare.prototype.readField;
      }
      return this.prepareDone(connection);
    }
    const def = new Packets$5.ColumnDefinition(packet, connection.clientEncoding);
    this.parameterDefinitions.push(def);
    if (this.parameterDefinitions.length === this.parameterCount) {
      return Prepare.prototype.parametersEOF;
    }
    return this.readParameter;
  }

  readField(packet, connection) {
    if (packet.isEOF()) {
      return this.prepareDone(connection);
    }
    const def = new Packets$5.ColumnDefinition(packet, connection.clientEncoding);
    this.fields.push(def);
    if (this.fields.length === this.fieldCount) {
      return Prepare.prototype.fieldsEOF;
    }
    return Prepare.prototype.readField;
  }

  parametersEOF(packet, connection) {
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet after parameters');
    }
    if (this.fieldCount > 0) {
      return Prepare.prototype.readField;
    }
    return this.prepareDone(connection);
  }

  fieldsEOF(packet, connection) {
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet after fields');
    }
    return this.prepareDone(connection);
  }

  prepareDone(connection) {
    const statement = new PreparedStatementInfo(
      this.query,
      this.id,
      this.fields,
      this.parameterDefinitions,
      connection
    );
    connection._statements.set(this.key, statement);
    if (this.onResult) {
      this.onResult(null, statement);
    }
    return null;
  }
};

var prepare = Prepare$1;

const Command$5 = command;
const CommandCode$1 = commands$1;
const Packet$1 = packet;

// TODO: time statistics?
// usefull for queue size and network latency monitoring
// store created,sent,reply timestamps
let Ping$1 = class Ping extends Command$5 {
  constructor(callback) {
    super();
    this.onResult = callback;
  }

  start(packet, connection) {
    const ping = new Packet$1(
      0,
      Buffer.from([1, 0, 0, 0, CommandCode$1.PING]),
      0,
      5
    );
    connection.writePacket(ping);
    return Ping.prototype.pingResponse;
  }

  pingResponse() {
    // TODO: check it's OK packet. error check already done in caller
    if (this.onResult) {
      process.nextTick(this.onResult.bind(this));
    }
    return null;
  }
};

var ping = Ping$1;

const Command$4 = command;
const Packets$4 = packetsExports;

let RegisterSlave$1 = class RegisterSlave extends Command$4 {
  constructor(opts, callback) {
    super();
    this.onResult = callback;
    this.opts = opts;
  }

  start(packet, connection) {
    const newPacket = new Packets$4.RegisterSlave(this.opts);
    connection.writePacket(newPacket.toPacket(1));
    return RegisterSlave.prototype.registerResponse;
  }

  registerResponse() {
    if (this.onResult) {
      process.nextTick(this.onResult.bind(this));
    }
    return null;
  }
};

var register_slave = RegisterSlave$1;

var binlog_query_statusvars;
var hasRequiredBinlog_query_statusvars;

function requireBinlog_query_statusvars () {
	if (hasRequiredBinlog_query_statusvars) return binlog_query_statusvars;
	hasRequiredBinlog_query_statusvars = 1;

	// http://dev.mysql.com/doc/internals/en/query-event.html

	const keys = {
	  FLAGS2: 0,
	  SQL_MODE: 1,
	  CATALOG: 2,
	  CHARSET: 4,
	  TIME_ZONE: 5,
	  CATALOG_NZ: 6,
	  LC_TIME_NAMES: 7,
	  CHARSET_DATABASE: 8,
	  TABLE_MAP_FOR_UPDATE: 9,
	  MASTER_DATA_WRITTEN: 10,
	  INVOKERS: 11,
	  UPDATED_DB_NAMES: 12,
	  MICROSECONDS: 3,
	};

	binlog_query_statusvars = function parseStatusVars(buffer) {
	  const result = {};
	  let offset = 0;
	  let key, length, prevOffset;
	  while (offset < buffer.length) {
	    key = buffer[offset++];
	    switch (key) {
	      case keys.FLAGS2:
	        result.flags = buffer.readUInt32LE(offset);
	        offset += 4;
	        break;
	      case keys.SQL_MODE:
	        // value is 8 bytes, but all dcumented flags are in first 4 bytes
	        result.sqlMode = buffer.readUInt32LE(offset);
	        offset += 8;
	        break;
	      case keys.CATALOG:
	        length = buffer[offset++];
	        result.catalog = buffer.toString('utf8', offset, offset + length);
	        offset += length + 1; // null byte after string
	        break;
	      case keys.CHARSET:
	        result.clientCharset = buffer.readUInt16LE(offset);
	        result.connectionCollation = buffer.readUInt16LE(offset + 2);
	        result.serverCharset = buffer.readUInt16LE(offset + 4);
	        offset += 6;
	        break;
	      case keys.TIME_ZONE:
	        length = buffer[offset++];
	        result.timeZone = buffer.toString('utf8', offset, offset + length);
	        offset += length; // no null byte
	        break;
	      case keys.CATALOG_NZ:
	        length = buffer[offset++];
	        result.catalogNz = buffer.toString('utf8', offset, offset + length);
	        offset += length; // no null byte
	        break;
	      case keys.LC_TIME_NAMES:
	        result.lcTimeNames = buffer.readUInt16LE(offset);
	        offset += 2;
	        break;
	      case keys.CHARSET_DATABASE:
	        result.schemaCharset = buffer.readUInt16LE(offset);
	        offset += 2;
	        break;
	      case keys.TABLE_MAP_FOR_UPDATE:
	        result.mapForUpdate1 = buffer.readUInt32LE(offset);
	        result.mapForUpdate2 = buffer.readUInt32LE(offset + 4);
	        offset += 8;
	        break;
	      case keys.MASTER_DATA_WRITTEN:
	        result.masterDataWritten = buffer.readUInt32LE(offset);
	        offset += 4;
	        break;
	      case keys.INVOKERS:
	        length = buffer[offset++];
	        result.invokerUsername = buffer.toString(
	          'utf8',
	          offset,
	          offset + length
	        );
	        offset += length;
	        length = buffer[offset++];
	        result.invokerHostname = buffer.toString(
	          'utf8',
	          offset,
	          offset + length
	        );
	        offset += length;
	        break;
	      case keys.UPDATED_DB_NAMES:
	        length = buffer[offset++];
	        // length - number of null-terminated strings
	        result.updatedDBs = []; // we'll store them as array here
	        for (; length; --length) {
	          prevOffset = offset;
	          // fast forward to null terminating byte
	          while (buffer[offset++] && offset < buffer.length) {
	            // empty body, everything inside while condition
	          }
	          result.updatedDBs.push(
	            buffer.toString('utf8', prevOffset, offset - 1)
	          );
	        }
	        break;
	      case keys.MICROSECONDS:
	        result.microseconds =
	          // REVIEW: INVALID UNKNOWN VARIABLE!
	          buffer.readInt16LE(offset) + (buffer[offset + 2] << 16);
	        offset += 3;
	    }
	  }
	  return result;
	};
	return binlog_query_statusvars;
}

const Command$3 = command;
const Packets$3 = packetsExports;

const eventParsers = [];

class BinlogEventHeader {
  constructor(packet) {
    this.timestamp = packet.readInt32();
    this.eventType = packet.readInt8();
    this.serverId = packet.readInt32();
    this.eventSize = packet.readInt32();
    this.logPos = packet.readInt32();
    this.flags = packet.readInt16();
  }
}

let BinlogDump$1 = class BinlogDump extends Command$3 {
  constructor(opts) {
    super();
    // this.onResult = callback;
    this.opts = opts;
  }

  start(packet, connection) {
    const newPacket = new Packets$3.BinlogDump(this.opts);
    connection.writePacket(newPacket.toPacket(1));
    return BinlogDump.prototype.binlogData;
  }

  binlogData(packet) {
    // ok - continue consuming events
    // error - error
    // eof - end of binlog
    if (packet.isEOF()) {
      this.emit('eof');
      return null;
    }
    // binlog event header
    packet.readInt8();
    const header = new BinlogEventHeader(packet);
    const EventParser = eventParsers[header.eventType];
    let event;
    if (EventParser) {
      event = new EventParser(packet);
    } else {
      event = {
        name: 'UNKNOWN',
      };
    }
    event.header = header;
    this.emit('event', event);
    return BinlogDump.prototype.binlogData;
  }
};

class RotateEvent {
  constructor(packet) {
    this.pposition = packet.readInt32();
    // TODO: read uint64 here
    packet.readInt32(); // positionDword2
    this.nextBinlog = packet.readString();
    this.name = 'RotateEvent';
  }
}

class FormatDescriptionEvent {
  constructor(packet) {
    this.binlogVersion = packet.readInt16();
    this.serverVersion = packet.readString(50).replace(/\u0000.*/, ''); // eslint-disable-line no-control-regex
    this.createTimestamp = packet.readInt32();
    this.eventHeaderLength = packet.readInt8(); // should be 19
    this.eventsLength = packet.readBuffer();
    this.name = 'FormatDescriptionEvent';
  }
}

class QueryEvent {
  constructor(packet) {
    const parseStatusVars = /*@__PURE__*/ requireBinlog_query_statusvars();
    this.slaveProxyId = packet.readInt32();
    this.executionTime = packet.readInt32();
    const schemaLength = packet.readInt8();
    this.errorCode = packet.readInt16();
    const statusVarsLength = packet.readInt16();
    const statusVars = packet.readBuffer(statusVarsLength);
    this.schema = packet.readString(schemaLength);
    packet.readInt8(); // should be zero
    this.statusVars = parseStatusVars(statusVars);
    this.query = packet.readString();
    this.name = 'QueryEvent';
  }
}

class XidEvent {
  constructor(packet) {
    this.binlogVersion = packet.readInt16();
    this.xid = packet.readInt64();
    this.name = 'XidEvent';
  }
}

eventParsers[2] = QueryEvent;
eventParsers[4] = RotateEvent;
eventParsers[15] = FormatDescriptionEvent;
eventParsers[16] = XidEvent;

var binlog_dump = BinlogDump$1;

const Command$2 = command;
const Packets$2 = packetsExports;
const ClientConstants$1 = client;
const ClientHandshake$1 = client_handshake;
const CharsetToEncoding$1 = /*@__PURE__*/ requireCharset_encodings();

let ChangeUser$1 = class ChangeUser extends Command$2 {
  constructor(options, callback) {
    super();
    this.onResult = callback;
    this.user = options.user;
    this.password = options.password;
    // "password1" is an alias of "password"
    this.password1 = options.password;
    this.password2 = options.password2;
    this.password3 = options.password3;
    this.database = options.database;
    this.passwordSha1 = options.passwordSha1;
    this.charsetNumber = options.charsetNumber;
    this.currentConfig = options.currentConfig;
    this.authenticationFactor = 0;
  }
  start(packet, connection) {
    const newPacket = new Packets$2.ChangeUser({
      flags: connection.config.clientFlags,
      user: this.user,
      database: this.database,
      charsetNumber: this.charsetNumber,
      password: this.password,
      passwordSha1: this.passwordSha1,
      authPluginData1: connection._handshakePacket.authPluginData1,
      authPluginData2: connection._handshakePacket.authPluginData2,
    });
    this.currentConfig.user = this.user;
    this.currentConfig.password = this.password;
    this.currentConfig.database = this.database;
    this.currentConfig.charsetNumber = this.charsetNumber;
    connection.clientEncoding = CharsetToEncoding$1[this.charsetNumber];
    // clear prepared statements cache as all statements become invalid after changeUser
    connection._statements.clear();
    connection.writePacket(newPacket.toPacket());
    // check if the server supports multi-factor authentication
    const multiFactorAuthentication =
      connection.serverCapabilityFlags &
      ClientConstants$1.MULTI_FACTOR_AUTHENTICATION;
    if (multiFactorAuthentication) {
      // if the server supports multi-factor authentication, we enable it in
      // the client
      this.authenticationFactor = 1;
    }
    return ChangeUser.prototype.handshakeResult;
  }
};

ChangeUser$1.prototype.handshakeResult =
  ClientHandshake$1.prototype.handshakeResult;
ChangeUser$1.prototype.calculateNativePasswordAuthToken =
  ClientHandshake$1.prototype.calculateNativePasswordAuthToken;

var change_user = ChangeUser$1;

const Command$1 = command;
const Packets$1 = packetsExports;

let ResetConnection$1 = class ResetConnection extends Command$1 {
  constructor(callback) {
    super();
    this.onResult = callback;
  }

  start(packet, connection) {
    const req = new Packets$1.ResetConnection();
    connection.writePacket(req.toPacket());
    return ResetConnection.prototype.resetConnectionResponse;
  }

  resetConnectionResponse(packet, connection) {
    if (connection._statements) {
      connection._statements.clear();
    }
    if (this.onResult) {
      process.nextTick(this.onResult.bind(this, null));
    }
    return null;
  }
};

var reset_connection = ResetConnection$1;

const Command = command;
const CommandCode = commands$1;
const Packet = packet;

let Quit$1 = class Quit extends Command {
  constructor(callback) {
    super();
    this.onResult = callback;
  }

  start(packet, connection) {
    connection._closing = true;
    const quit = new Packet(
      0,
      Buffer.from([1, 0, 0, 0, CommandCode.QUIT]),
      0,
      5
    );
    if (this.onResult) {
      this.onResult();
    }
    connection.writePacket(quit);
    return null;
  }
};

var quit = Quit$1;

const ClientHandshake = client_handshake;
const ServerHandshake = server_handshake;
const Query = query;
const Prepare = prepare;
const Execute = execute;
const Ping = ping;
const RegisterSlave = register_slave;
const BinlogDump = binlog_dump;
const ChangeUser = change_user;
const ResetConnection = reset_connection;
const Quit = quit;

var commands = {
  ClientHandshake,
  ServerHandshake,
  Query,
  Prepare,
  Execute,
  Ping,
  RegisterSlave,
  BinlogDump,
  ChangeUser,
  ResetConnection,
  Quit,
};

const require$$0$1 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(url);

var version$1 = "3.22.5";
const require$$3 = {
	version: version$1};

var ssl_profiles = {};

const require$$0 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(awsSslProfiles);

var hasRequiredSsl_profiles;

function requireSsl_profiles () {
	if (hasRequiredSsl_profiles) return ssl_profiles;
	hasRequiredSsl_profiles = 1;
	(function (exports) {

		const awsCaBundle = require$$0;

		/**
		 * @deprecated
		 * Please, use [**aws-ssl-profiles**](https://github.com/mysqljs/aws-ssl-profiles).
		 */
		exports['Amazon RDS'] = {
		  ca: awsCaBundle.ca,
		}; 
	} (ssl_profiles));
	return ssl_profiles;
}

const { URL: URL$1 } = require$$0$1;
const ClientConstants = client;
const Charsets = /*@__PURE__*/ requireCharsets();
const { version } = require$$3;
let SSLProfiles = null;

const validOptions = {
  authPlugins: 1,
  authSwitchHandler: 1,
  bigNumberStrings: 1,
  charset: 1,
  charsetNumber: 1,
  compress: 1,
  connectAttributes: 1,
  connectTimeout: 1,
  database: 1,
  dateStrings: 1,
  debug: 1,
  decimalNumbers: 1,
  enableKeepAlive: 1,
  flags: 1,
  host: 1,
  insecureAuth: 1,
  infileStreamFactory: 1,
  isServer: 1,
  keepAliveInitialDelay: 1,
  localAddress: 1,
  maxPreparedStatements: 1,
  multipleStatements: 1,
  namedPlaceholders: 1,
  nestTables: 1,
  password: 1,
  // with multi-factor authentication, the main password (used for the first
  // authentication factor) can be provided via password1
  password1: 1,
  password2: 1,
  password3: 1,
  passwordSha1: 1,
  pool: 1,
  port: 1,
  queryFormat: 1,
  rowsAsArray: 1,
  socketPath: 1,
  ssl: 1,
  stream: 1,
  stringifyObjects: 1,
  supportBigNumbers: 1,
  timezone: 1,
  trace: 1,
  typeCast: 1,
  uri: 1,
  user: 1,
  disableEval: 1,
  enableCleartextPlugin: 1,
  // These options are used for Pool
  connectionLimit: 1,
  maxIdle: 1,
  idleTimeout: 1,
  Promise: 1,
  queueLimit: 1,
  resetOnRelease: 1,
  waitForConnections: 1,
  jsonStrings: 1,
  gracefulEnd: 1,
};

let ConnectionConfig$3 = class ConnectionConfig {
  constructor(options) {
    if (typeof options === 'string') {
      options = ConnectionConfig.parseUrl(options);
    } else if (options && options.uri) {
      const uriOptions = ConnectionConfig.parseUrl(options.uri);
      for (const key in uriOptions) {
        if (!Object.prototype.hasOwnProperty.call(uriOptions, key)) continue;
        if (options[key]) continue;
        options[key] = uriOptions[key];
      }
    }
    for (const key in options) {
      if (!Object.prototype.hasOwnProperty.call(options, key)) continue;
      if (validOptions[key] !== 1) {
        // REVIEW: Should this be emitted somehow?
        console.error(
          `Ignoring invalid configuration option passed to Connection: ${key}. This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection`
        );
      }
    }
    this.isServer = options.isServer;
    this.stream = options.stream;
    this.host = options.host || 'localhost';
    this.port =
      (typeof options.port === 'string'
        ? parseInt(options.port, 10)
        : options.port) || 3306;
    this.localAddress = options.localAddress;
    this.socketPath = options.socketPath;
    this.user = options.user || undefined;
    // for the purpose of multi-factor authentication, or not, the main
    // password (used for the 1st authentication factor) can also be
    // provided via the "password1" option
    this.password = options.password || options.password1 || undefined;
    this.password2 = options.password2 || undefined;
    this.password3 = options.password3 || undefined;
    this.passwordSha1 = options.passwordSha1 || undefined;
    this.database = options.database;
    this.connectTimeout = isNaN(options.connectTimeout)
      ? 10 * 1000
      : options.connectTimeout;
    this.insecureAuth = options.insecureAuth || false;
    this.infileStreamFactory = options.infileStreamFactory || undefined;
    this.supportBigNumbers = options.supportBigNumbers || false;
    this.bigNumberStrings = options.bigNumberStrings || false;
    this.decimalNumbers = options.decimalNumbers || false;
    this.dateStrings = options.dateStrings || false;
    this.debug = options.debug;
    this.trace = options.trace !== false;
    this.stringifyObjects = options.stringifyObjects || false;
    this.enableKeepAlive = options.enableKeepAlive !== false;
    this.keepAliveInitialDelay = options.keepAliveInitialDelay;
    if (
      options.timezone &&
      !/^(?:local|Z|[ +-]\d\d:\d\d)$/.test(options.timezone)
    ) {
      // strictly supports timezones specified by mysqljs/mysql:
      // https://github.com/mysqljs/mysql#user-content-connection-options

      console.error(
        `Ignoring invalid timezone passed to Connection: ${options.timezone}. This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection`
      );
      // SqlStrings falls back to UTC on invalid timezone
      this.timezone = 'Z';
    } else {
      this.timezone = options.timezone || 'local';
    }
    this.queryFormat = options.queryFormat;
    this.pool = options.pool || undefined;
    this.ssl =
      typeof options.ssl === 'string'
        ? ConnectionConfig.getSSLProfile(options.ssl)
        : options.ssl || false;
    this.multipleStatements = options.multipleStatements || false;
    this.rowsAsArray = options.rowsAsArray || false;
    this.namedPlaceholders = options.namedPlaceholders || false;
    this.nestTables =
      options.nestTables === undefined ? undefined : options.nestTables;
    this.typeCast = options.typeCast === undefined ? true : options.typeCast;
    this.disableEval = Boolean(options.disableEval);
    this.enableCleartextPlugin = Boolean(options.enableCleartextPlugin);
    if (this.timezone[0] === ' ') {
      // "+" is a url encoded char for space so it
      // gets translated to space when giving a
      // connection string..
      this.timezone = `+${this.timezone.slice(1)}`;
    }
    if (this.ssl) {
      if (typeof this.ssl !== 'object') {
        throw new TypeError(
          `SSL profile must be an object, instead it's a ${typeof this.ssl}`
        );
      }
      // Default rejectUnauthorized to true
      this.ssl.rejectUnauthorized = this.ssl.rejectUnauthorized !== false;
    }
    this.maxPacketSize = 0;
    this.charsetNumber = options.charset
      ? ConnectionConfig.getCharsetNumber(options.charset)
      : options.charsetNumber || Charsets.UTF8MB4_UNICODE_CI;
    this.compress = options.compress || false;
    this.authPlugins = options.authPlugins;
    this.authSwitchHandler = options.authSwitchHandler;
    this.clientFlags = ConnectionConfig.mergeFlags(
      ConnectionConfig.getDefaultFlags(options),
      options.flags || ''
    );
    // Default connection attributes
    // https://dev.mysql.com/doc/refman/8.0/en/performance-schema-connection-attribute-tables.html
    const defaultConnectAttributes = {
      _client_name: 'Node-MySQL-2',
      _client_version: version,
    };
    this.connectAttributes = {
      ...defaultConnectAttributes,
      ...(options.connectAttributes || {}),
    };
    this.maxPreparedStatements = options.maxPreparedStatements || 16000;
    this.jsonStrings = options.jsonStrings || false;
    this.gracefulEnd = options.gracefulEnd || false;
  }

  static mergeFlags(default_flags, user_flags) {
    let flags = 0x0,
      i;
    if (!Array.isArray(user_flags)) {
      user_flags = String(user_flags || '')
        .toUpperCase()
        .split(/\s*,+\s*/);
    }
    // add default flags unless "blacklisted"
    for (i in default_flags) {
      if (user_flags.indexOf(`-${default_flags[i]}`) >= 0) {
        continue;
      }
      flags |= ClientConstants[default_flags[i]] || 0x0;
    }
    // add user flags unless already already added
    for (i in user_flags) {
      if (user_flags[i][0] === '-') {
        continue;
      }
      if (default_flags.indexOf(user_flags[i]) >= 0) {
        continue;
      }
      flags |= ClientConstants[user_flags[i]] || 0x0;
    }
    return flags;
  }

  static getDefaultFlags(options) {
    const defaultFlags = [
      'LONG_PASSWORD',
      'FOUND_ROWS',
      'LONG_FLAG',
      'CONNECT_WITH_DB',
      'ODBC',
      'LOCAL_FILES',
      'IGNORE_SPACE',
      'PROTOCOL_41',
      'IGNORE_SIGPIPE',
      'TRANSACTIONS',
      'RESERVED',
      'SECURE_CONNECTION',
      'MULTI_RESULTS',
      'TRANSACTIONS',
      'SESSION_TRACK',
      'CONNECT_ATTRS',
      'CLIENT_QUERY_ATTRIBUTES',
    ];
    if (options && options.multipleStatements) {
      defaultFlags.push('MULTI_STATEMENTS');
    }
    defaultFlags.push('PLUGIN_AUTH');
    defaultFlags.push('PLUGIN_AUTH_LENENC_CLIENT_DATA');

    return defaultFlags;
  }

  static getCharsetNumber(charset) {
    const num = Charsets[charset.toUpperCase()];
    if (num === undefined) {
      throw new TypeError(`Unknown charset '${charset}'`);
    }
    return num;
  }

  static getSSLProfile(name) {
    if (!SSLProfiles) {
      SSLProfiles = /*@__PURE__*/ requireSsl_profiles();
    }
    const ssl = SSLProfiles[name];
    if (ssl === undefined) {
      throw new TypeError(`Unknown SSL profile '${name}'`);
    }
    return ssl;
  }

  static parseUrl(url) {
    const parsedUrl = new URL$1(url);
    const options = {
      host: decodeURIComponent(parsedUrl.hostname),
      port: parseInt(parsedUrl.port, 10),
      database: decodeURIComponent(parsedUrl.pathname.slice(1)),
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
    };
    for (const [key, value] of parsedUrl.searchParams) {
      if (key in options) {
        continue;
      }
      try {
        // Try to parse this as a JSON expression first
        options[key] = JSON.parse(value);
      } catch {
        // Otherwise assume it is a plain string
        options[key] = value;
      }
    }
    return options;
  }
};

var connection_config = ConnectionConfig$3;

const process$3 = require$$0$6;

// Safe load: use getBuiltinModule if available, fallback to require, catch if unavailable
const dc = (() => {
  try {
    return 'getBuiltinModule' in process$3
      ? process$3.getBuiltinModule('node:diagnostics_channel')
      : require('node:diagnostics_channel');
  } catch {
    return undefined;
  }
})();

const hasTracingChannel = typeof dc?.tracingChannel === 'function';

const queryChannel$1 = hasTracingChannel
  ? dc.tracingChannel('mysql2:query')
  : undefined;

const executeChannel$1 = hasTracingChannel
  ? dc.tracingChannel('mysql2:execute')
  : undefined;

const connectChannel$1 = hasTracingChannel
  ? dc.tracingChannel('mysql2:connect')
  : undefined;

const poolConnectChannel$1 = hasTracingChannel
  ? dc.tracingChannel('mysql2:pool:connect')
  : undefined;

function getServerContext$2(config) {
  if (config.socketPath) {
    return { serverAddress: config.socketPath, serverPort: undefined };
  }
  return {
    serverAddress: config.host || 'localhost',
    serverPort: config.port || 3306,
  };
}

// Node 20+: TracingChannel has an aggregated hasSubscribers getter.
// Node 18.x: that getter is missing (undefined), fall back to start sub-channel.
function shouldTrace$1(channel) {
  if (channel === undefined || channel === null) {
    return false;
  }
  return channel.hasSubscribers ?? channel.start?.hasSubscribers ?? false;
}

// Generic traceCallback wrapper — calls fn synchronously, wraps the callback
// at args[position] to emit asyncStart/asyncEnd/error. No promises involved.
function traceCallback$2(channel, fn, position, context, thisArg, ...args) {
  if (shouldTrace$1(channel)) {
    return channel.traceCallback(fn, position, context(), thisArg, ...args);
  }
  return fn.apply(thisArg, args);
}

// tracePromise for operations that are inherently async (connection handshake)
function tracePromise$1(channel, fn, contextFactory) {
  if (shouldTrace$1(channel)) {
    return channel.tracePromise(fn, contextFactory());
  }
  return fn();
}

var tracing = {
  shouldTrace: shouldTrace$1,
  queryChannel: queryChannel$1,
  executeChannel: executeChannel$1,
  connectChannel: connectChannel$1,
  poolConnectChannel: poolConnectChannel$1,
  getServerContext: getServerContext$2,
  traceCallback: traceCallback$2,
  tracePromise: tracePromise$1,
};

const require$$14 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(namedPlaceholders);

const Net = require$$0$5;
const Tls = require$$1$1;
const Timers = require$$2$1;
const EventEmitter$4 = require$$1$2.EventEmitter;
const Readable = require$$4$2.Readable;
const Queue$1 = require$$4$1;
const SqlString$1 = require$$0$7;
const { createLRU } = require$$7;
const PacketParser = packet_parser;
const Packets = packetsExports;
const Commands = commands;
const ConnectionConfig$2 = connection_config;
const CharsetToEncoding = /*@__PURE__*/ requireCharset_encodings();
const {
  traceCallback: traceCallback$1,
  tracePromise,
  getServerContext: getServerContext$1,
  shouldTrace,
  queryChannel,
  executeChannel,
  connectChannel,
} = tracing;

let _connectionId = 0;

let convertNamedPlaceholders = null;

let BaseConnection$3 = class BaseConnection extends EventEmitter$4 {
  constructor(opts) {
    super();
    this.config = opts.config;
    // TODO: fill defaults
    // if no params, connect to /var/lib/mysql/mysql.sock ( /tmp/mysql.sock on OSX )
    // if host is given, connect to host:3306
    // TODO: use `/usr/local/mysql/bin/mysql_config --socket` output? as default socketPath
    // if there is no host/port and no socketPath parameters?
    if (!opts.config.stream) {
      if (opts.config.socketPath) {
        this.stream = Net.connect(opts.config.socketPath);
      } else {
        this.stream = Net.connect(opts.config.port, opts.config.host);

        // Optionally enable keep-alive on the socket.
        if (this.config.enableKeepAlive) {
          this.stream.on('connect', () => {
            this.stream.setKeepAlive(true, this.config.keepAliveInitialDelay);
          });
        }

        // Enable TCP_NODELAY flag. This is needed so that the network packets
        // are sent immediately to the server
        this.stream.setNoDelay(true);
      }
      // if stream is a function, treat it as "stream agent / factory"
    } else if (typeof opts.config.stream === 'function') {
      this.stream = opts.config.stream(opts);
    } else {
      this.stream = opts.config.stream;
    }

    this._internalId = _connectionId++;
    this._commands = new Queue$1();
    this._command = null;
    this._paused = false;
    this._paused_packets = new Queue$1();
    this._statements = createLRU({
      max: this.config.maxPreparedStatements,
      onEviction: function (_, statement) {
        statement.close();
      },
    });
    this.serverCapabilityFlags = 0;
    this.authorized = false;
    this.sequenceId = 0;
    this.compressedSequenceId = 0;
    this.threadId = null;
    this._handshakePacket = null;
    this._fatalError = null;
    this._protocolError = null;
    this._outOfOrderPackets = [];
    this.clientEncoding = CharsetToEncoding[this.config.charsetNumber];
    this.stream.on('error', this._handleNetworkError.bind(this));
    // see https://gist.github.com/khoomeister/4985691#use-that-instead-of-bind
    this.packetParser = new PacketParser((p) => {
      this.handlePacket(p);
    });
    this.stream.on('data', (data) => {
      if (this.connectTimeout) {
        Timers.clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      this.packetParser.execute(data);
    });
    this.stream.on('end', () => {
      // emit the end event so that the pooled connection can close the connection
      this.emit('end');
    });
    this.stream.on('close', () => {
      // we need to set this flag everywhere where we want connection to close
      if (this._closing) {
        return;
      }
      if (!this._protocolError) {
        // no particular error message before disconnect
        this._protocolError = new Error(
          'Connection lost: The server closed the connection.'
        );
        this._protocolError.fatal = true;
        this._protocolError.code = 'PROTOCOL_CONNECTION_LOST';
      }
      this._notifyError(this._protocolError);
    });
    let handshakeCommand;
    if (!this.config.isServer) {
      handshakeCommand = new Commands.ClientHandshake(this.config.clientFlags);
      handshakeCommand.on('end', () => {
        // this happens when handshake finishes early either because there was
        // some fatal error or the server sent an error packet instead of
        // an hello packet (for example, 'Too many connections' error)
        if (
          !handshakeCommand.handshake ||
          this._fatalError ||
          this._protocolError
        ) {
          return;
        }
        this._handshakePacket = handshakeCommand.handshake;
        this.threadId = handshakeCommand.handshake.connectionId;
        this.emit('connect', handshakeCommand.handshake);
      });
      handshakeCommand.on('error', (err) => {
        this._closing = true;
        this._notifyError(err);
      });
      this.addCommand(handshakeCommand);

      // Trace the connection handshake
      if (shouldTrace(connectChannel)) {
        const config = this.config;
        tracePromise(
          connectChannel,
          () =>
            new Promise((resolve, reject) => {
              /* eslint-disable prefer-const */
              let onConnect, onError;
              onConnect = (param) => {
                this.removeListener('error', onError);
                resolve(param);
              };
              onError = (err) => {
                this.removeListener('connect', onConnect);
                reject(err);
              };
              /* eslint-enable prefer-const */
              this.once('connect', onConnect);
              this.once('error', onError);
            }),
          () => {
            const server = getServerContext$1(config);
            return {
              database: config.database || '',
              serverAddress: server.serverAddress,
              serverPort: server.serverPort,
              user: config.user || '',
            };
          }
        ).catch(() => {
          // errors are already handled by the handshake error listener
        });
      }
    }
    // in case there was no initial handshake but we need to read sting, assume it utf-8
    // most common example: "Too many connections" error ( packet is sent immediately on connection attempt, we don't know server encoding yet)
    // will be overwritten with actual encoding value as soon as server handshake packet is received
    this.serverEncoding = 'utf8';
    if (this.config.connectTimeout) {
      const timeoutHandler = this._handleTimeoutError.bind(this);
      this.connectTimeout = Timers.setTimeout(
        timeoutHandler,
        this.config.connectTimeout
      );
    }
  }

  _addCommandClosedState(cmd) {
    const err = new Error(
      "Can't add new command when connection is in closed state"
    );
    err.fatal = true;
    if (cmd.onResult) {
      cmd.onResult(err);
    } else {
      this.emit('error', err);
    }
  }

  _handleFatalError(err) {
    err.fatal = true;
    // stop receiving packets
    this.stream.removeAllListeners('data');
    this.addCommand = this._addCommandClosedState;
    this.write = () => {
      this.emit('error', new Error("Can't write in closed state"));
    };
    this._notifyError(err);
    this._fatalError = err;
  }

  _handleNetworkError(err) {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    // Do not throw an error when a connection ends with a RST,ACK packet
    if (err.code === 'ECONNRESET' && this._closing) {
      return;
    }
    this._handleFatalError(err);
  }

  _handleTimeoutError() {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this.stream.destroy && this.stream.destroy();
    const err = new Error('connect ETIMEDOUT');
    err.errorno = 'ETIMEDOUT';
    err.code = 'ETIMEDOUT';
    err.syscall = 'connect';
    this._handleNetworkError(err);
  }

  // notify all commands in the queue and bubble error as connection "error"
  // called on stream error or unexpected termination
  _notifyError(err) {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    // prevent from emitting 'PROTOCOL_CONNECTION_LOST' after EPIPE or ECONNRESET
    if (this._fatalError) {
      return;
    }
    let command;
    // if there is no active command, notify connection
    // if there are commands and all of them have callbacks, pass error via callback
    let bubbleErrorToConnection = !this._command;
    if (this._command && this._command.onResult) {
      this._command.onResult(err);
      this._command = null;
      // connection handshake is special because we allow it to be implicit
      // if error happened during handshake, but there are others commands in queue
      // then bubble error to other commands and not to connection
    } else if (
      !(
        this._command &&
        this._command.constructor === Commands.ClientHandshake &&
        this._commands.length > 0
      )
    ) {
      bubbleErrorToConnection = true;
    }
    while ((command = this._commands.shift())) {
      if (command.onResult) {
        command.onResult(err);
      } else {
        bubbleErrorToConnection = true;
      }
    }
    // notify connection if some comands in the queue did not have callbacks
    // or if this is pool connection ( so it can be removed from pool )
    if (bubbleErrorToConnection || this._pool) {
      this.emit('error', err);
    }
    // close connection after emitting the event in case of a fatal error
    if (err.fatal) {
      this.close();
    }
  }

  write(buffer) {
    const result = this.stream.write(buffer, (err) => {
      if (err) {
        this._handleNetworkError(err);
      }
    });

    if (!result) {
      this.stream.emit('pause');
    }
  }

  // http://dev.mysql.com/doc/internals/en/sequence-id.html
  //
  // The sequence-id is incremented with each packet and may wrap around.
  // It starts at 0 and is reset to 0 when a new command
  // begins in the Command Phase.
  // http://dev.mysql.com/doc/internals/en/example-several-mysql-packets.html
  _resetSequenceId() {
    this.sequenceId = 0;
    this.compressedSequenceId = 0;
  }

  _bumpCompressedSequenceId(numPackets) {
    this.compressedSequenceId += numPackets;
    this.compressedSequenceId %= 256;
  }

  _bumpSequenceId(numPackets) {
    this.sequenceId += numPackets;
    this.sequenceId %= 256;
  }

  writePacket(packet) {
    const MAX_PACKET_LENGTH = 16777215;
    const length = packet.length();
    let chunk, offset, header;
    if (length < MAX_PACKET_LENGTH) {
      packet.writeHeader(this.sequenceId);
      if (this.config.debug) {
        console.log(
          `${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${[this.sequenceId, packet._name, packet.length()].join(',')})`
        );
        console.log(
          `${this._internalId} ${this.connectionId} <== ${packet.buffer.toString('hex')}`
        );
      }
      this._bumpSequenceId(1);
      this.write(packet.buffer);
    } else {
      if (this.config.debug) {
        console.log(
          `${this._internalId} ${this.connectionId} <== Writing large packet, raw content not written:`
        );
        console.log(
          `${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${[this.sequenceId, packet._name, packet.length()].join(',')})`
        );
      }
      for (offset = 4; offset < 4 + length; offset += MAX_PACKET_LENGTH) {
        chunk = packet.buffer.slice(offset, offset + MAX_PACKET_LENGTH);
        if (chunk.length === MAX_PACKET_LENGTH) {
          header = Buffer.from([0xff, 0xff, 0xff, this.sequenceId]);
        } else {
          header = Buffer.from([
            chunk.length & 0xff,
            (chunk.length >> 8) & 0xff,
            (chunk.length >> 16) & 0xff,
            this.sequenceId,
          ]);
        }
        this._bumpSequenceId(1);
        this.write(header);
        this.write(chunk);
      }
    }
  }

  // 0.11+ environment
  startTLS(onSecure) {
    if (this.config.debug) {
      console.log('Upgrading connection to TLS');
    }
    const secureContext = Tls.createSecureContext({
      ca: this.config.ssl.ca,
      cert: this.config.ssl.cert,
      ciphers: this.config.ssl.ciphers,
      key: this.config.ssl.key,
      passphrase: this.config.ssl.passphrase,
      minVersion: this.config.ssl.minVersion,
      maxVersion: this.config.ssl.maxVersion,
    });
    const rejectUnauthorized = this.config.ssl.rejectUnauthorized;
    const verifyIdentity = this.config.ssl.verifyIdentity;
    const servername = Net.isIP(this.config.host)
      ? undefined
      : this.config.host;

    let secureEstablished = false;
    this.stream.removeAllListeners('data');
    const secureSocket = Tls.connect(
      {
        rejectUnauthorized,
        requestCert: rejectUnauthorized,
        checkServerIdentity: verifyIdentity
          ? Tls.checkServerIdentity
          : function () {
              return undefined;
            },
        secureContext,
        isServer: false,
        socket: this.stream,
        servername,
      },
      () => {
        secureEstablished = true;
        if (rejectUnauthorized) {
          if (typeof servername === 'string' && verifyIdentity) {
            const cert = secureSocket.getPeerCertificate(true);
            const serverIdentityCheckError = Tls.checkServerIdentity(
              servername,
              cert
            );
            if (serverIdentityCheckError) {
              onSecure(serverIdentityCheckError);
              return;
            }
          }
        }
        onSecure();
      }
    );
    // error handler for secure socket
    secureSocket.on('error', (err) => {
      if (secureEstablished) {
        this._handleNetworkError(err);
      } else {
        onSecure(err);
      }
    });
    secureSocket.on('data', (data) => {
      this.packetParser.execute(data);
    });
    this.stream = secureSocket;
  }

  protocolError(message, code) {
    // Starting with MySQL 8.0.24, if the client closes the connection
    // unexpectedly, the server will send a last ERR Packet, which we can
    // safely ignore.
    // https://dev.mysql.com/worklog/task/?id=12999
    if (this._closing) {
      return;
    }

    const err = new Error(message);
    err.fatal = true;
    err.code = code || 'PROTOCOL_ERROR';
    this.emit('error', err);
  }

  get state() {
    // Error state has highest priority
    if (this._fatalError || this._protocolError) {
      return 'error';
    }

    // Closing state has second priority
    if (this._closing || (this.stream && this.stream.destroyed)) {
      return 'disconnected';
    }

    // Authenticated state has third priority
    if (this.authorized) {
      return 'authenticated';
    }

    // Connected state: handshake completed but not yet authorized
    // This matches the original mysql driver's 'connected' state
    if (this._handshakePacket) {
      return 'connected';
    }

    // Protocol handshake state: connection established, handshake in progress
    if (this.stream && !this.stream.destroyed) {
      return 'protocol_handshake';
    }

    // Default: not connected
    return 'disconnected';
  }

  get fatalError() {
    return this._fatalError;
  }

  handlePacket(packet) {
    if (this._paused) {
      this._paused_packets.push(packet);
      return;
    }
    if (this.config.debug) {
      if (packet) {
        console.log(
          ` raw: ${packet.buffer
            .slice(packet.offset, packet.offset + packet.length())
            .toString('hex')}`
        );
        console.trace();
        const commandName = this._command
          ? this._command._commandName
          : '(no command)';
        const stateName = this._command
          ? this._command.stateName()
          : '(no command)';
        console.log(
          `${this._internalId} ${this.connectionId} ==> ${commandName}#${stateName}(${[packet.sequenceId, packet.type(), packet.length()].join(',')})`
        );
      }
    }
    if (!this._command) {
      const marker = packet.peekByte();
      // If it's an Err Packet, we should use it.
      if (marker === 0xff) {
        const error = Packets.Error.fromPacket(packet);
        this.protocolError(error.message, error.code);
      } else {
        // Otherwise, it means it's some other unexpected packet.
        this.protocolError(
          'Unexpected packet while no commands in the queue',
          'PROTOCOL_UNEXPECTED_PACKET'
        );
      }
      this.close();
      return;
    }
    if (packet) {
      // Note: when server closes connection due to inactivity, Err packet ER_CLIENT_INTERACTION_TIMEOUT from MySQL 8.0.24, sequenceId will be 0
      if (this.sequenceId !== packet.sequenceId) {
        const err = new Error(
          `Warning: got packets out of order. Expected ${this.sequenceId} but received ${packet.sequenceId}`
        );
        err.expected = this.sequenceId;
        err.received = packet.sequenceId;
        this.emit('warn', err); // REVIEW
        console.error(err.message);
      }
      this._bumpSequenceId(packet.numPackets);
    }
    try {
      if (this._fatalError) {
        // skip remaining packets after client is in the error state
        return;
      }
      const done = this._command.execute(packet, this);
      if (done) {
        this._command = this._commands.shift();
        if (this._command) {
          this.sequenceId = 0;
          this.compressedSequenceId = 0;
          this.handlePacket();
        }
      }
    } catch (err) {
      this._handleFatalError(err);
      this.stream.destroy();
    }
  }

  addCommand(cmd) {
    // this.compressedSequenceId = 0;
    // this.sequenceId = 0;
    if (this.config.debug) {
      const commandName = cmd.constructor.name;
      console.log(`Add command: ${commandName}`);
      cmd._commandName = commandName;
    }
    if (!this._command) {
      this._command = cmd;
      this.handlePacket();
    } else {
      this._commands.push(cmd);
    }
    return cmd;
  }

  format(sql, values) {
    if (typeof this.config.queryFormat === 'function') {
      return this.config.queryFormat.call(
        this,
        sql,
        values,
        this.config.timezone
      );
    }
    const opts = {
      sql: sql,
      values: values,
    };
    this._resolveNamedPlaceholders(opts);
    return SqlString$1.format(
      opts.sql,
      opts.values,
      this.config.stringifyObjects,
      this.config.timezone
    );
  }

  escape(value) {
    return SqlString$1.escape(value, false, this.config.timezone);
  }

  escapeId(value) {
    return SqlString$1.escapeId(value, false);
  }

  raw(sql) {
    return SqlString$1.raw(sql);
  }

  _resolveNamedPlaceholders(options) {
    let unnamed;
    if (this.config.namedPlaceholders || options.namedPlaceholders) {
      if (Array.isArray(options.values)) {
        // if an array is provided as the values, assume the conversion is not necessary.
        // this allows the usage of unnamed placeholders even if the namedPlaceholders flag is enabled.
        return;
      }
      if (convertNamedPlaceholders === null) {
        convertNamedPlaceholders = require$$14();
      }
      unnamed = convertNamedPlaceholders(options.sql, options.values);
      options.sql = unnamed[0];
      options.values = unnamed[1];
    }
  }

  query(sql, values, cb) {
    let cmdQuery;
    if (sql.constructor === Commands.Query) {
      cmdQuery = sql;
    } else {
      cmdQuery = BaseConnection.createQuery(sql, values, cb, this.config);
    }
    this._resolveNamedPlaceholders(cmdQuery);
    const rawSql = this.format(
      cmdQuery.sql,
      cmdQuery.values !== undefined ? cmdQuery.values : []
    );
    cmdQuery.sql = rawSql;

    if (cmdQuery.onResult) {
      // Callback mode: traceCallback wraps the callback with tracing lifecycle, or calls through directly when no subscribers are registered
      traceCallback$1(
        queryChannel,
        (wrappedCb) => {
          cmdQuery.onResult = wrappedCb;
          this.addCommand(cmdQuery);
        },
        0,
        () => {
          const server = getServerContext$1(this.config);
          return {
            query: cmdQuery.sql,
            values: cmdQuery.values,
            database: this.config.database || '',
            serverAddress: server.serverAddress,
            serverPort: server.serverPort,
          };
        },
        null,
        cmdQuery.onResult
      );
    } else if (shouldTrace(queryChannel)) {
      // Event-emitter mode: tracePromise wraps the async lifecycle
      tracePromise(
        queryChannel,
        () =>
          new Promise((resolve, reject) => {
            cmdQuery.once('error', reject);
            cmdQuery.once('end', () => resolve());
            this.addCommand(cmdQuery);
          }),
        () => {
          const server = getServerContext$1(this.config);
          return {
            query: cmdQuery.sql,
            values: cmdQuery.values,
            database: this.config.database || '',
            serverAddress: server.serverAddress,
            serverPort: server.serverPort,
          };
        }
      ).catch(() => {
        // errors are already emitted on the command
      });
    } else {
      this.addCommand(cmdQuery);
    }

    return cmdQuery;
  }

  pause() {
    this._paused = true;
    this.stream.pause();
  }

  resume() {
    let packet;
    this._paused = false;
    while ((packet = this._paused_packets.shift())) {
      this.handlePacket(packet);
      // don't resume if packet handler paused connection
      if (this._paused) {
        return;
      }
    }
    this.stream.resume();
  }

  // TODO: named placeholders support
  prepare(options, cb) {
    if (typeof options === 'string') {
      options = { sql: options };
    }
    return this.addCommand(new Commands.Prepare(options, cb));
  }

  unprepare(sql) {
    let options = {};
    if (typeof sql === 'object') {
      options = sql;
    } else {
      options.sql = sql;
    }
    const key = BaseConnection.statementKey(options);
    const stmt = this._statements.get(key);
    if (stmt) {
      this._statements.delete(key);
      stmt.close();
    }
    return stmt;
  }

  execute(sql, values, cb) {
    let options = {
      infileStreamFactory: this.config.infileStreamFactory,
    };
    if (typeof sql === 'object') {
      // execute(options, cb)
      options = {
        ...options,
        ...sql,
        sql: sql.sql,
        values: sql.values,
      };
      if (typeof values === 'function') {
        cb = values;
      } else {
        options.values = options.values || values;
      }
    } else if (typeof values === 'function') {
      // execute(sql, cb)
      cb = values;
      options.sql = sql;
      options.values = undefined;
    } else {
      // execute(sql, values, cb)
      options.sql = sql;
      options.values = values;
    }
    this._resolveNamedPlaceholders(options);
    // check for values containing undefined
    if (options.values) {
      //If namedPlaceholder is not enabled and object is passed as bind parameters
      if (!Array.isArray(options.values)) {
        throw new TypeError(
          'Bind parameters must be array if namedPlaceholders parameter is not enabled'
        );
      }
      options.values.forEach((val) => {
        //If namedPlaceholder is not enabled and object is passed as bind parameters
        if (!Array.isArray(options.values)) {
          throw new TypeError(
            'Bind parameters must be array if namedPlaceholders parameter is not enabled'
          );
        }
        if (val === undefined) {
          throw new TypeError(
            'Bind parameters must not contain undefined. To pass SQL NULL specify JS null'
          );
        }
        if (typeof val === 'function') {
          throw new TypeError(
            'Bind parameters must not contain function(s). To pass the body of a function as a string call .toString() first'
          );
        }
      });
    }
    const executeCommand = new Commands.Execute(options, cb);

    const prepareAndExecute = (errorCb) => {
      const prepareCommand = new Commands.Prepare(options, (err, stmt) => {
        if (err) {
          // skip execute command if prepare failed
          executeCommand.start = function () {
            return null;
          };
          errorCb(err);
          executeCommand.emit('end');
          return;
        }
        executeCommand.statement = stmt;
      });
      this.addCommand(prepareCommand);
      this.addCommand(executeCommand);
    };

    if (executeCommand.onResult) {
      // Callback mode: traceCallback wraps the callback with tracing lifecycle, or calls through directly when no subscribers are registered
      const origExecCb = executeCommand.onResult;
      traceCallback$1(
        executeChannel,
        (wrappedCb) => {
          executeCommand.onResult = wrappedCb;
          prepareAndExecute(wrappedCb);
        },
        0,
        () => {
          const server = getServerContext$1(this.config);
          return {
            query: options.sql,
            values: options.values,
            database: this.config.database || '',
            serverAddress: server.serverAddress,
            serverPort: server.serverPort,
          };
        },
        null,
        origExecCb
      );
    } else if (shouldTrace(executeChannel)) {
      // Event-emitter mode: tracePromise wraps the async lifecycle
      tracePromise(
        executeChannel,
        () =>
          new Promise((resolve, reject) => {
            prepareAndExecute((err) => {
              executeCommand.emit('error', err);
            });
            executeCommand.once('error', reject);
            executeCommand.once('end', () => resolve());
          }),
        () => {
          const server = getServerContext$1(this.config);
          return {
            query: options.sql,
            values: options.values,
            database: this.config.database || '',
            serverAddress: server.serverAddress,
            serverPort: server.serverPort,
          };
        }
      ).catch(() => {
        // errors are already emitted on the command
      });
    } else {
      prepareAndExecute((err) => {
        executeCommand.emit('error', err);
      });
    }

    return executeCommand;
  }

  changeUser(options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    const charsetNumber = options.charset
      ? ConnectionConfig$2.getCharsetNumber(options.charset)
      : this.config.charsetNumber;
    return this.addCommand(
      new Commands.ChangeUser(
        {
          user: options.user || this.config.user,
          // for the purpose of multi-factor authentication, or not, the main
          // password (used for the 1st authentication factor) can also be
          // provided via the "password1" option
          password:
            options.password ||
            options.password1 ||
            this.config.password ||
            this.config.password1,
          password2: options.password2 || this.config.password2,
          password3: options.password3 || this.config.password3,
          passwordSha1: options.passwordSha1 || this.config.passwordSha1,
          database: options.database || this.config.database,
          timeout: options.timeout,
          charsetNumber: charsetNumber,
          currentConfig: this.config,
        },
        (err) => {
          if (err) {
            err.fatal = true;
          }
          if (callback) {
            callback(err);
          }
        }
      )
    );
  }

  // transaction helpers
  beginTransaction(cb) {
    return this.query('START TRANSACTION', cb);
  }

  commit(cb) {
    return this.query('COMMIT', cb);
  }

  rollback(cb) {
    return this.query('ROLLBACK', cb);
  }

  ping(cb) {
    return this.addCommand(new Commands.Ping(cb));
  }

  reset(cb) {
    return this.addCommand(new Commands.ResetConnection(cb));
  }

  _registerSlave(opts, cb) {
    return this.addCommand(new Commands.RegisterSlave(opts, cb));
  }

  _binlogDump(opts, cb) {
    return this.addCommand(new Commands.BinlogDump(opts, cb));
  }

  // currently just alias to close
  destroy() {
    this.close();
  }

  close() {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this._closing = true;
    this.stream.end();
    this.addCommand = this._addCommandClosedState;
  }

  createBinlogStream(opts) {
    // TODO: create proper stream class
    // TODO: use through2
    let test = 1;
    const stream = new Readable({ objectMode: true });
    stream._read = function () {
      return {
        data: test++,
      };
    };
    this._registerSlave(opts, () => {
      const dumpCmd = this._binlogDump(opts);
      dumpCmd.on('event', (ev) => {
        stream.push(ev);
      });
      dumpCmd.on('eof', () => {
        stream.push(null);
        // if non-blocking, then close stream to prevent errors
        if (opts.flags && opts.flags & 0x01) {
          this.close();
        }
      });
      // TODO: pipe errors as well
    });
    return stream;
  }

  connect(cb) {
    if (!cb) {
      return;
    }

    if (this._fatalError || this._protocolError) {
      return cb(this._fatalError || this._protocolError);
    }

    if (this._handshakePacket) {
      return cb(null, this);
    }

    /* eslint-disable prefer-const */
    let onError, onConnect;

    onError = (param) => {
      this.removeListener('connect', onConnect);
      cb(param);
    };

    onConnect = (param) => {
      this.removeListener('error', onError);
      cb(null, param);
    };
    /* eslint-enable prefer-const */

    this.once('error', onError);
    this.once('connect', onConnect);
  }

  // ===================================
  // outgoing server connection methods
  // ===================================
  writeColumns(columns) {
    this.writePacket(Packets.ResultSetHeader.toPacket(columns.length));
    columns.forEach((column) => {
      this.writePacket(
        Packets.ColumnDefinition.toPacket(column, this.serverConfig.encoding)
      );
    });
    this.writeEof();
  }

  // row is array of columns, not hash
  writeTextRow(column) {
    this.writePacket(
      Packets.TextRow.toPacket(column, this.serverConfig.encoding)
    );
  }

  writeBinaryRow(column) {
    this.writePacket(
      Packets.BinaryRow.toPacket(column, this.serverConfig.encoding)
    );
  }

  writeTextResult(rows, columns, binary = false) {
    this.writeColumns(columns);
    rows.forEach((row) => {
      const arrayRow = new Array(columns.length);
      columns.forEach((column) => {
        arrayRow.push(row[column.name]);
      });
      if (binary) {
        this.writeBinaryRow(arrayRow);
      } else this.writeTextRow(arrayRow);
    });
    this.writeEof();
  }

  writeEof(warnings, statusFlags) {
    this.writePacket(Packets.EOF.toPacket(warnings, statusFlags));
  }

  writeOk(args) {
    if (!args) {
      args = { affectedRows: 0 };
    }
    this.writePacket(Packets.OK.toPacket(args, this.serverConfig.encoding));
  }

  writeError(args) {
    // if we want to send error before initial hello was sent, use default encoding
    const encoding = this.serverConfig ? this.serverConfig.encoding : 'cesu8';
    this.writePacket(Packets.Error.toPacket(args, encoding));
  }

  serverHandshake(args) {
    this.serverConfig = args;
    this.serverConfig.encoding =
      CharsetToEncoding[this.serverConfig.characterSet];
    return this.addCommand(new Commands.ServerHandshake(args));
  }

  [Symbol.dispose]() {
    if (!this._closing) {
      this.end();
    }
  }

  // ===============================================================
  end(callback) {
    if (this.config.isServer) {
      this._closing = true;
      const quitCmd = new EventEmitter$4();
      setImmediate(() => {
        this.stream.end();
        quitCmd.emit('end');
      });
      return quitCmd;
    }
    // trigger error if more commands enqueued after end command
    const quitCmd = this.addCommand(new Commands.Quit(callback));
    this.addCommand = this._addCommandClosedState;
    return quitCmd;
  }

  static createQuery(sql, values, cb, config) {
    let options = {
      rowsAsArray: config.rowsAsArray,
      infileStreamFactory: config.infileStreamFactory,
    };
    if (typeof sql === 'object') {
      // query(options, cb)
      options = {
        ...options,
        ...sql,
        sql: sql.sql,
        values: sql.values,
      };
      if (typeof values === 'function') {
        cb = values;
      } else if (values !== undefined) {
        options.values = values;
      }
    } else if (typeof values === 'function') {
      // query(sql, cb)
      cb = values;
      options.sql = sql;
      options.values = undefined;
    } else {
      // query(sql, values, cb)
      options.sql = sql;
      options.values = values;
    }
    return new Commands.Query(options, cb);
  }

  static statementKey(options) {
    return `${typeof options.nestTables}/${options.nestTables}/${options.rowsAsArray}${options.sql}`;
  }
};

var connection$2 = BaseConnection$3;

/** @param {Function} constructorOpt Passed to Error.captureStackTrace (omit this frame from stacks). */
function captureStackHolder$4(constructorOpt) {
  const holder = {};
  Error.captureStackTrace(holder, constructorOpt);
  return holder;
}

/**
 * Replace `err.stack` frames with the capture from `holder`, keeping the
 * callback error instance and its MySQL fields.
 *
 * @param {Error} err
 * @param {{ stack?: string }} holder
 */
function applyCapturedStack$3(err, holder) {
  const stack = holder && holder.stack;
  if (typeof stack !== 'string' || !stack) return;
  const lines = stack.split('\n');
  lines[0] = `${err.name}: ${err.message}`;
  err.stack = lines.join('\n');
}

var capture_local_err = { captureStackHolder: captureStackHolder$4, applyCapturedStack: applyCapturedStack$3 };

const { applyCapturedStack: applyCapturedStack$2 } = capture_local_err;

function makeDoneCb$4(resolve, reject, stackHolder) {
  return function (err, rows, fields) {
    if (err) {
      applyCapturedStack$2(err, stackHolder);
      reject(err);
    } else {
      resolve([rows, fields]);
    }
  };
}

var make_done_cb = makeDoneCb$4;

const { captureStackHolder: captureStackHolder$3 } = capture_local_err;
const makeDoneCb$3 = make_done_cb;

let PromisePreparedStatementInfo$1 = class PromisePreparedStatementInfo {
  constructor(statement, promiseImpl) {
    this.statement = statement;
    this.Promise = promiseImpl;
  }

  execute(parameters) {
    const s = this.statement;
    const stackHolder = captureStackHolder$3(
      PromisePreparedStatementInfo.prototype.execute
    );
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$3(resolve, reject, stackHolder);
      if (parameters) {
        s.execute(parameters, done);
      } else {
        s.execute(done);
      }
    });
  }

  close() {
    return new this.Promise((resolve) => {
      this.statement.close();
      resolve();
    });
  }
};

var prepared_statement_info = PromisePreparedStatementInfo$1;

function inheritEvents$2(source, target, events) {
  const listeners = {};
  target
    .on('newListener', (eventName) => {
      if (events.indexOf(eventName) >= 0 && !target.listenerCount(eventName)) {
        source.on(
          eventName,
          (listeners[eventName] = function () {
            const args = [].slice.call(arguments);
            args.unshift(eventName);

            target.emit.apply(target, args);
          })
        );
      }
    })
    .on('removeListener', (eventName) => {
      if (events.indexOf(eventName) >= 0 && !target.listenerCount(eventName)) {
        source.removeListener(eventName, listeners[eventName]);
        delete listeners[eventName];
      }
    });
}

var inherit_events = inheritEvents$2;

const EventEmitter$3 = require$$1$2.EventEmitter;
const PromisePreparedStatementInfo = prepared_statement_info;
const {
  captureStackHolder: captureStackHolder$2,
  applyCapturedStack: applyCapturedStack$1,
} = capture_local_err;
const makeDoneCb$2 = make_done_cb;
const inheritEvents$1 = inherit_events;
const BaseConnection$2 = connection$2;

let PromiseConnection$1 = class PromiseConnection extends EventEmitter$3 {
  constructor(connection, promiseImpl) {
    super();
    this.connection = connection;
    this.Promise = promiseImpl || Promise;
    inheritEvents$1(connection, this, [
      'error',
      'drain',
      'connect',
      'end',
      'enqueue',
    ]);
  }

  release() {
    this.connection.release();
  }

  query(query, params) {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(PromiseConnection.prototype.query);
    if (typeof params === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$2(resolve, reject, stackHolder);
      if (params !== undefined) {
        c.query(query, params, done);
      } else {
        c.query(query, done);
      }
    });
  }

  execute(query, params) {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(PromiseConnection.prototype.execute);
    if (typeof params === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$2(resolve, reject, stackHolder);
      if (params !== undefined) {
        c.execute(query, params, done);
      } else {
        c.execute(query, done);
      }
    });
  }

  end() {
    return new this.Promise((resolve) => {
      this.connection.end(resolve);
    });
  }

  async [Symbol.asyncDispose]() {
    if (!this.connection._closing) {
      await this.end();
    }
  }

  beginTransaction() {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(
      PromiseConnection.prototype.beginTransaction
    );
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$2(resolve, reject, stackHolder);
      c.beginTransaction(done);
    });
  }

  commit() {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(PromiseConnection.prototype.commit);
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$2(resolve, reject, stackHolder);
      c.commit(done);
    });
  }

  rollback() {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(
      PromiseConnection.prototype.rollback
    );
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$2(resolve, reject, stackHolder);
      c.rollback(done);
    });
  }

  ping() {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(PromiseConnection.prototype.ping);
    return new this.Promise((resolve, reject) => {
      c.ping((err) => {
        if (err) {
          applyCapturedStack$1(err, stackHolder);
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  reset() {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(PromiseConnection.prototype.reset);
    return new this.Promise((resolve, reject) => {
      c.reset((err) => {
        if (err) {
          applyCapturedStack$1(err, stackHolder);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  connect() {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(PromiseConnection.prototype.connect);
    return new this.Promise((resolve, reject) => {
      c.connect((err, param) => {
        if (err) {
          applyCapturedStack$1(err, stackHolder);
          reject(err);
        } else {
          resolve(param);
        }
      });
    });
  }

  prepare(options) {
    const c = this.connection;
    const promiseImpl = this.Promise;
    const stackHolder = captureStackHolder$2(PromiseConnection.prototype.prepare);
    return new this.Promise((resolve, reject) => {
      c.prepare(options, (err, statement) => {
        if (err) {
          applyCapturedStack$1(err, stackHolder);
          reject(err);
        } else {
          const wrappedStatement = new PromisePreparedStatementInfo(
            statement,
            promiseImpl
          );
          resolve(wrappedStatement);
        }
      });
    });
  }

  changeUser(options) {
    const c = this.connection;
    const stackHolder = captureStackHolder$2(
      PromiseConnection.prototype.changeUser
    );
    return new this.Promise((resolve, reject) => {
      c.changeUser(options, (err) => {
        if (err) {
          applyCapturedStack$1(err, stackHolder);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  get config() {
    return this.connection.config;
  }

  get threadId() {
    return this.connection.threadId;
  }
};
// patching PromiseConnection
// create facade functions for prototype functions on "Connection" that are not yet
// implemented with PromiseConnection

// proxy synchronous functions only
(function (functionsToWrap) {
  for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
    const func = functionsToWrap[i];

    if (
      typeof BaseConnection$2.prototype[func] === 'function' &&
      PromiseConnection$1.prototype[func] === undefined
    ) {
      PromiseConnection$1.prototype[func] = (function factory(funcName) {
        return function () {
          return BaseConnection$2.prototype[funcName].apply(
            this.connection,
            arguments
          );
        };
      })(func);
    }
  }
})([
  // synchronous functions
  'close',
  'createBinlogStream',
  'destroy',
  'escape',
  'escapeId',
  'format',
  'pause',
  'pipe',
  'resume',
  'unprepare',
]);

var connection$1 = PromiseConnection$1;

const BaseConnection$1 = connection$2;

let Connection$3 = class Connection extends BaseConnection$1 {
  promise(promiseImpl) {
    const PromiseConnection = connection$1;
    return new PromiseConnection(this, promiseImpl);
  }
};

var connection = Connection$3;

const PromiseConnection = connection$1;

let PromisePoolConnection$2 = class PromisePoolConnection extends PromiseConnection {
  constructor(connection, promiseImpl) {
    super(connection, promiseImpl);
  }

  destroy() {
    return this.connection.destroy();
  }

  async [Symbol.asyncDispose]() {
    this.release();
  }
};

var pool_connection$1 = PromisePoolConnection$2;

const Connection$2 = connection;

let PoolConnection$1 = class PoolConnection extends Connection$2 {
  constructor(pool, options) {
    super(options);
    this._pool = pool;
    this._released = false;
    this.lastActiveTime = Date.now();
    this.once('end', () => {
      this._removeFromPool();
    });
    this.once('error', () => {
      this._removeFromPool();
    });
  }

  release() {
    if (this._released) {
      return;
    }
    if (!this._pool || this._pool._closed) {
      return;
    }
    this._released = true;
    this.lastActiveTime = Date.now();
    this._pool.releaseConnection(this);
  }

  [Symbol.dispose]() {
    this.release();
  }

  end(callback) {
    if (this.config.gracefulEnd) {
      this._removeFromPool();
      super.end(callback);

      return;
    }

    const err = new Error(
      'Calling conn.end() to release a pooled connection is ' +
        'deprecated. In next version calling conn.end() will be ' +
        'restored to default conn.end() behavior. Use ' +
        'conn.release() instead.'
    );
    this.emit('warn', err);
    console.warn(err.message);
    this.release();
    if (typeof callback === 'function') {
      callback();
    }
  }

  destroy() {
    this._removeFromPool();
    super.destroy();
  }

  _removeFromPool() {
    if (!this._pool || this._pool._closed) {
      return;
    }
    const pool = this._pool;
    this._pool = null;
    pool._removeConnection(this);
  }

  promise(promiseImpl) {
    const PromisePoolConnection = pool_connection$1;
    return new PromisePoolConnection(this, promiseImpl);
  }
};

PoolConnection$1.statementKey = Connection$2.statementKey;
var pool_connection = PoolConnection$1;

// TODO: Remove this when we are removing PoolConnection#end
PoolConnection$1.prototype._realEnd = Connection$2.prototype.end;

const process$2 = require$$0$6;
const SqlString = require$$0$7;
const EventEmitter$2 = require$$1$2.EventEmitter;
const PoolConnection = pool_connection;
const Queue = require$$4$1;
const BaseConnection = connection$2;
const Errors = errors;
const {
  traceCallback,
  getServerContext,
  poolConnectChannel,
} = tracing;

// Source: https://github.com/go-sql-driver/mysql/blob/76c00e35a8d48f8f70f0e7dffe584692bd3fa612/packets.go#L598-L613
function isReadOnlyError(err) {
  if (!err || !err.errno) {
    return false;
  }
  // 1792: ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION
  // 1290: ER_OPTION_PREVENTS_STATEMENT (returned by Aurora during failover)
  // 1836: ER_READ_ONLY_MODE
  return (
    err.errno === Errors.ER_OPTION_PREVENTS_STATEMENT ||
    err.errno === Errors.ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION ||
    err.errno === Errors.ER_READ_ONLY_MODE
  );
}

function spliceConnection(queue, connection) {
  const len = queue.length;
  for (let i = 0; i < len; i++) {
    if (queue.get(i) === connection) {
      queue.removeOne(i);
      break;
    }
  }
}

let BasePool$2 = class BasePool extends EventEmitter$2 {
  constructor(options) {
    super();
    this.config = options.config;
    this.config.connectionConfig.pool = this;
    this._allConnections = new Queue();
    this._freeConnections = new Queue();
    this._connectionQueue = new Queue();
    this._closed = false;
    if (this.config.maxIdle < this.config.connectionLimit) {
      // create idle connection timeout automatically release job
      this._removeIdleTimeoutConnections();
    }
  }

  getConnection(cb) {
    const _getConnection = (cb) => {
      if (this._closed) {
        return process$2.nextTick(() => cb(new Error('Pool is closed.')));
      }
      let connection;
      if (this._freeConnections.length > 0) {
        connection = this._freeConnections.pop();
        this.emit('acquire', connection);
        return process$2.nextTick(() => {
          connection._released = false;
          cb(null, connection);
        });
      }
      if (
        this.config.connectionLimit === 0 ||
        this._allConnections.length < this.config.connectionLimit
      ) {
        connection = new PoolConnection(this, {
          config: this.config.connectionConfig,
        });
        this._allConnections.push(connection);
        return connection.connect((err) => {
          if (this._closed) {
            return cb(new Error('Pool is closed.'));
          }
          if (err) {
            return cb(err);
          }
          this.emit('connection', connection);
          this.emit('acquire', connection);
          return cb(null, connection);
        });
      }
      if (!this.config.waitForConnections) {
        return process$2.nextTick(() =>
          cb(new Error('No connections available.'))
        );
      }
      if (
        this.config.queueLimit &&
        this._connectionQueue.length >= this.config.queueLimit
      ) {
        return cb(new Error('Queue limit reached.'));
      }
      this.emit('enqueue');
      return this._connectionQueue.push(cb);
    };
    const config = this.config.connectionConfig;
    traceCallback(
      poolConnectChannel,
      _getConnection,
      0,
      () => {
        const server = getServerContext(config);
        return {
          database: config.database || '',
          serverAddress: server.serverAddress,
          serverPort: server.serverPort,
        };
      },
      null,
      cb
    );
  }

  releaseConnection(connection) {
    let cb;
    if (!connection._pool) {
      // The connection has been removed from the pool and is no longer good.
      if (this._connectionQueue.length) {
        cb = this._connectionQueue.shift();
        process$2.nextTick(this.getConnection.bind(this, cb));
      }
      return;
    }

    // Reset connection state if configured
    if (this.config.resetOnRelease && connection.reset) {
      connection.reset((err) => {
        if (err) {
          // If reset fails, remove connection from pool
          connection._pool = null;
          spliceConnection(this._allConnections, connection);
          connection.destroy();

          // Try to create a new connection for waiting callbacks
          if (this._connectionQueue.length) {
            cb = this._connectionQueue.shift();
            process$2.nextTick(this.getConnection.bind(this, cb));
          }
          return;
        }

        // Reset successful, continue with normal release flow
        this._handleSuccessfulRelease(connection);
      });
    } else {
      this._handleSuccessfulRelease(connection);
    }
  }

  _handleSuccessfulRelease(connection) {
    let cb;
    if (this._connectionQueue.length) {
      cb = this._connectionQueue.shift();
      process$2.nextTick(() => {
        connection._released = false;
        cb(null, connection);
      });
    } else {
      this._freeConnections.push(connection);
      this.emit('release', connection);
    }
  }

  [Symbol.dispose]() {
    if (!this._closed) {
      this.end();
    }
  }

  end(cb) {
    this._closed = true;
    clearTimeout(this._removeIdleTimeoutConnectionsTimer);
    if (typeof cb !== 'function') {
      cb = function (err) {
        if (err) {
          throw err;
        }
      };
    }
    while (this._connectionQueue.length > 0) {
      const queuedCallback = this._connectionQueue.shift();
      process$2.nextTick(() => queuedCallback(new Error('Pool is closed.')));
    }
    let calledBack = false;
    let closedConnections = 0;
    let connection;
    const endCB = function (err) {
      if (calledBack) {
        return;
      }
      if (err || ++closedConnections >= this._allConnections.length) {
        calledBack = true;
        cb(err);
        return;
      }
    }.bind(this);
    if (this._allConnections.length === 0) {
      endCB();
      return;
    }
    for (let i = 0; i < this._allConnections.length; i++) {
      connection = this._allConnections.get(i);
      connection._realEnd(endCB);
    }
  }

  query(sql, values, cb) {
    const cmdQuery = BaseConnection.createQuery(
      sql,
      values,
      cb,
      this.config.connectionConfig
    );
    if (typeof cmdQuery.namedPlaceholders === 'undefined') {
      cmdQuery.namedPlaceholders =
        this.config.connectionConfig.namedPlaceholders;
    }
    this.getConnection((err, conn) => {
      if (err) {
        if (typeof cmdQuery.onResult === 'function') {
          cmdQuery.onResult(err);
        } else {
          cmdQuery.emit('error', err);
        }
        return;
      }
      try {
        let queryError = null;
        const origOnResult = cmdQuery.onResult;
        if (origOnResult) {
          cmdQuery.onResult = function (err, rows, fields) {
            queryError = err || null;
            origOnResult(err, rows, fields);
          };
        } else {
          cmdQuery.once('error', (err) => {
            queryError = err;
          });
        }
        conn.query(cmdQuery).once('end', () => {
          if (isReadOnlyError(queryError)) {
            conn.destroy();
          } else {
            conn.release();
          }
        });
      } catch (e) {
        conn.release();
        throw e;
      }
    });
    return cmdQuery;
  }

  execute(sql, values, cb) {
    // TODO construct execute command first here and pass it to connection.execute
    // so that polymorphic arguments logic is there in one place
    if (typeof values === 'function') {
      cb = values;
      values = [];
    }
    this.getConnection((err, conn) => {
      if (err) {
        return cb(err);
      }
      try {
        conn
          .execute(sql, values, (err, rows, fields) => {
            if (isReadOnlyError(err)) {
              conn.destroy();
            }
            cb(err, rows, fields);
          })
          .once('end', () => {
            conn.release();
          });
      } catch (e) {
        conn.release();
        return cb(e);
      }
    });
  }

  _removeConnection(connection) {
    // Remove connection from all connections
    spliceConnection(this._allConnections, connection);
    // Remove connection from free connections
    spliceConnection(this._freeConnections, connection);
    this.releaseConnection(connection);
  }

  _removeIdleTimeoutConnections() {
    if (this._removeIdleTimeoutConnectionsTimer) {
      clearTimeout(this._removeIdleTimeoutConnectionsTimer);
    }

    this._removeIdleTimeoutConnectionsTimer = setTimeout(() => {
      try {
        while (
          this._freeConnections.length > this.config.maxIdle ||
          (this._freeConnections.length > 0 &&
            Date.now() - this._freeConnections.get(0).lastActiveTime >
              this.config.idleTimeout)
        ) {
          if (this.config.connectionConfig.gracefulEnd) {
            this._freeConnections.get(0).end();
          } else {
            this._freeConnections.get(0).destroy();
          }
        }
      } finally {
        this._removeIdleTimeoutConnections();
      }
    }, 1000);
  }

  format(sql, values) {
    return SqlString.format(
      sql,
      values,
      this.config.connectionConfig.stringifyObjects,
      this.config.connectionConfig.timezone
    );
  }

  escape(value) {
    return SqlString.escape(
      value,
      this.config.connectionConfig.stringifyObjects,
      this.config.connectionConfig.timezone
    );
  }

  escapeId(value) {
    return SqlString.escapeId(value, false);
  }
};

var pool$2 = BasePool$2;

const EventEmitter$1 = require$$1$2.EventEmitter;
const {
  captureStackHolder: captureStackHolder$1,
  applyCapturedStack,
} = capture_local_err;
const makeDoneCb$1 = make_done_cb;
const PromisePoolConnection$1 = pool_connection$1;
const inheritEvents = inherit_events;
const BasePool$1 = pool$2;

class PromisePool extends EventEmitter$1 {
  constructor(pool, thePromise) {
    super();
    this.pool = pool;
    this.Promise = thePromise || Promise;
    inheritEvents(pool, this, ['acquire', 'connection', 'enqueue', 'release']);
  }

  getConnection() {
    const corePool = this.pool;
    return new this.Promise((resolve, reject) => {
      corePool.getConnection((err, coreConnection) => {
        if (err) {
          reject(err);
        } else {
          resolve(new PromisePoolConnection$1(coreConnection, this.Promise));
        }
      });
    });
  }

  releaseConnection(connection) {
    if (connection instanceof PromisePoolConnection$1) connection.release();
  }

  query(sql, args) {
    const corePool = this.pool;
    const stackHolder = captureStackHolder$1(PromisePool.prototype.query);
    if (typeof args === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$1(resolve, reject, stackHolder);
      if (args !== undefined) {
        corePool.query(sql, args, done);
      } else {
        corePool.query(sql, done);
      }
    });
  }

  execute(sql, args) {
    const corePool = this.pool;
    const stackHolder = captureStackHolder$1(PromisePool.prototype.execute);
    if (typeof args === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb$1(resolve, reject, stackHolder);
      if (args) {
        corePool.execute(sql, args, done);
      } else {
        corePool.execute(sql, done);
      }
    });
  }

  end() {
    const corePool = this.pool;
    const stackHolder = captureStackHolder$1(PromisePool.prototype.end);
    return new this.Promise((resolve, reject) => {
      corePool.end((err) => {
        if (err) {
          applyCapturedStack(err, stackHolder);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async [Symbol.asyncDispose]() {
    if (!this.pool._closed) {
      await this.end();
    }
  }
}

(function (functionsToWrap) {
  for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
    const func = functionsToWrap[i];

    if (
      typeof BasePool$1.prototype[func] === 'function' &&
      PromisePool.prototype[func] === undefined
    ) {
      PromisePool.prototype[func] = (function factory(funcName) {
        return function () {
          return BasePool$1.prototype[funcName].apply(this.pool, arguments);
        };
      })(func);
    }
  }
})([
  // synchronous functions
  'escape',
  'escapeId',
  'format',
]);

var pool$1 = PromisePool;

const BasePool = pool$2;

let Pool$2 = class Pool extends BasePool {
  promise(promiseImpl) {
    const PromisePool = pool$1;
    return new PromisePool(this, promiseImpl);
  }
};

var pool = Pool$2;

const ConnectionConfig$1 = connection_config;

let PoolConfig$2 = class PoolConfig {
  constructor(options) {
    if (typeof options === 'string') {
      options = ConnectionConfig$1.parseUrl(options);
    }
    this.connectionConfig = new ConnectionConfig$1(options);
    this.waitForConnections =
      options.waitForConnections === undefined
        ? true
        : Boolean(options.waitForConnections);
    this.connectionLimit = isNaN(options.connectionLimit)
      ? 10
      : Number(options.connectionLimit);
    this.maxIdle = isNaN(options.maxIdle)
      ? this.connectionLimit
      : Number(options.maxIdle);
    this.idleTimeout = isNaN(options.idleTimeout)
      ? 60000
      : Number(options.idleTimeout);
    this.queueLimit = isNaN(options.queueLimit)
      ? 0
      : Number(options.queueLimit);
    this.resetOnRelease =
      options.resetOnRelease === undefined
        ? false
        : Boolean(options.resetOnRelease);
  }
};

var pool_config = PoolConfig$2;

const process$1 = require$$0$6;

const Pool$1 = pool;
const PoolConfig$1 = pool_config;
const Connection$1 = connection;
const EventEmitter = require$$1$2.EventEmitter;

/**
 * Selector
 */
const makeSelector = {
  RR() {
    let index = 0;
    return (clusterIds) => clusterIds[index++ % clusterIds.length];
  },
  RANDOM() {
    return (clusterIds) =>
      clusterIds[Math.floor(Math.random() * clusterIds.length)];
  },
  ORDER() {
    return (clusterIds) => clusterIds[0];
  },
};

const getMonotonicMilliseconds = function () {
  let ms;

  if (typeof process$1.hrtime === 'function') {
    ms = process$1.hrtime();
    ms = ms[0] * 1e3 + ms[1] * 1e-6;
  } else {
    ms = process$1.uptime() * 1000;
  }

  return Math.floor(ms);
};

const patternRegExp = function (pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  const source = pattern
    .replace(/([.+?^=!:${}()|[\]/\\])/g, '\\$1')
    .replace(/\*/g, '.*');

  return new RegExp(`^${source}$`);
};

class PoolNamespace {
  constructor(cluster, pattern, selector) {
    this._cluster = cluster;
    this._pattern = pattern;
    this._selector = makeSelector[selector]();
  }

  getConnection(cb) {
    const clusterNode = this._getClusterNode();
    if (clusterNode === null) {
      let err = new Error('Pool does Not exist.');
      err.code = 'POOL_NOEXIST';

      if (this._cluster._findNodeIds(this._pattern, true).length !== 0) {
        err = new Error('Pool does Not have online node.');
        err.code = 'POOL_NONEONLINE';
      }

      return cb(err);
    }
    return this._cluster._getConnection(clusterNode, (err, connection) => {
      if (err) {
        if (
          this._cluster._canRetry &&
          this._cluster._findNodeIds(this._pattern).length !== 0
        ) {
          this._cluster.emit('warn', err);
          return this.getConnection(cb);
        }

        return cb(err);
      }
      return cb(null, connection);
    });
  }

  /**
   * pool cluster query
   * @param {*} sql
   * @param {*} values
   * @param {*} cb
   * @returns query
   */
  query(sql, values, cb) {
    const query = Connection$1.createQuery(sql, values, cb, {});
    this.getConnection((err, conn) => {
      if (err) {
        if (typeof query.onResult === 'function') {
          query.onResult(err);
        } else {
          query.emit('error', err);
        }
        return;
      }
      try {
        conn.query(query).once('end', () => {
          conn.release();
        });
      } catch (e) {
        conn.release();
        throw e;
      }
    });
    return query;
  }

  /**
   * pool cluster execute
   * @param {*} sql
   * @param {*} values
   * @param {*} cb
   */
  execute(sql, values, cb) {
    if (typeof values === 'function') {
      cb = values;
      values = [];
    }
    this.getConnection((err, conn) => {
      if (err) {
        return cb(err);
      }
      try {
        conn.execute(sql, values, cb).once('end', () => {
          conn.release();
        });
      } catch (e) {
        conn.release();
        throw e;
      }
    });
  }

  _getClusterNode() {
    const foundNodeIds = this._cluster._findNodeIds(this._pattern);
    if (foundNodeIds.length === 0) {
      return null;
    }
    const nodeId =
      foundNodeIds.length === 1
        ? foundNodeIds[0]
        : this._selector(foundNodeIds);
    return this._cluster._getNode(nodeId);
  }
}

let PoolCluster$1 = class PoolCluster extends EventEmitter {
  constructor(config) {
    super();
    config = config || {};
    this._canRetry =
      typeof config.canRetry === 'undefined' ? true : config.canRetry;
    this._removeNodeErrorCount = config.removeNodeErrorCount || 5;
    this._restoreNodeTimeout = config.restoreNodeTimeout || 0;
    this._defaultSelector = config.defaultSelector || 'RR';
    this._closed = false;
    this._lastId = 0;
    this._nodes = {};
    this._serviceableNodeIds = [];
    this._namespaces = {};
    this._findCaches = {};
  }

  of(pattern, selector) {
    pattern = pattern || '*';
    selector = selector || this._defaultSelector;
    selector = selector.toUpperCase();
    if (!makeSelector[selector] === 'undefined') {
      selector = this._defaultSelector;
    }
    const key = pattern + selector;
    if (typeof this._namespaces[key] === 'undefined') {
      this._namespaces[key] = new PoolNamespace(this, pattern, selector);
    }
    return this._namespaces[key];
  }

  add(id, config) {
    if (typeof id === 'object') {
      config = id;
      id = `CLUSTER::${++this._lastId}`;
    }
    if (typeof this._nodes[id] === 'undefined') {
      this._nodes[id] = {
        id: id,
        errorCount: 0,
        pool: new Pool$1({ config: new PoolConfig$1(config) }),
        _offlineUntil: 0,
      };
      this._serviceableNodeIds.push(id);
      this._clearFindCaches();
    }
  }

  remove(pattern) {
    const foundNodeIds = this._findNodeIds(pattern, true);

    for (let i = 0; i < foundNodeIds.length; i++) {
      const node = this._getNode(foundNodeIds[i]);

      if (node) {
        this._removeNode(node);
      }
    }
  }

  getConnection(pattern, selector, cb) {
    let namespace;
    if (typeof pattern === 'function') {
      cb = pattern;
      namespace = this.of();
    } else {
      if (typeof selector === 'function') {
        cb = selector;
        selector = this._defaultSelector;
      }
      namespace = this.of(pattern, selector);
    }
    namespace.getConnection(cb);
  }

  [Symbol.dispose]() {
    if (!this._closed) {
      this.end();
    }
  }

  end(callback) {
    const cb =
      callback !== undefined
        ? callback
        : (err) => {
            if (err) {
              throw err;
            }
          };
    if (this._closed) {
      process$1.nextTick(cb);
      return;
    }

    this._closed = true;

    let calledBack = false;
    let waitingClose = 0;
    const onEnd = (err) => {
      if (!calledBack && (err || --waitingClose <= 0)) {
        calledBack = true;
        return cb(err);
      }
    };

    for (const id in this._nodes) {
      waitingClose++;
      this._nodes[id].pool.end(onEnd);
    }

    if (waitingClose === 0) {
      process$1.nextTick(onEnd);
    }
  }

  _findNodeIds(pattern, includeOffline) {
    let currentTime = 0;
    let foundNodeIds = this._findCaches[pattern];

    if (foundNodeIds === undefined) {
      const expression = patternRegExp(pattern);

      foundNodeIds = this._serviceableNodeIds.filter((id) =>
        id.match(expression)
      );
    }

    this._findCaches[pattern] = foundNodeIds;

    if (includeOffline) {
      return foundNodeIds;
    }

    return foundNodeIds.filter((nodeId) => {
      const node = this._getNode(nodeId);

      if (!node._offlineUntil) {
        return true;
      }

      if (!currentTime) {
        currentTime = getMonotonicMilliseconds();
      }

      return node._offlineUntil <= currentTime;
    });
  }

  _getNode(id) {
    return this._nodes[id] || null;
  }

  _increaseErrorCount(node) {
    const errorCount = ++node.errorCount;

    if (this._removeNodeErrorCount > errorCount) {
      return;
    }

    if (this._restoreNodeTimeout > 0) {
      node._offlineUntil =
        getMonotonicMilliseconds() + this._restoreNodeTimeout;
      this.emit('offline', node.id);
      return;
    }

    this._removeNode(node);
    this.emit('remove', node.id);
  }

  _decreaseErrorCount(node) {
    let errorCount = node.errorCount;

    if (errorCount > this._removeNodeErrorCount) {
      errorCount = this._removeNodeErrorCount;
    }

    if (errorCount < 1) {
      errorCount = 1;
    }

    node.errorCount = errorCount - 1;

    if (node._offlineUntil) {
      node._offlineUntil = 0;
      this.emit('online', node.id);
    }
  }

  _getConnection(node, cb) {
    node.pool.getConnection((err, connection) => {
      if (err) {
        this._increaseErrorCount(node);
        return cb(err);
      }
      this._decreaseErrorCount(node);

      connection._clusterId = node.id;
      return cb(null, connection);
    });
  }

  _removeNode(node) {
    const index = this._serviceableNodeIds.indexOf(node.id);
    if (index !== -1) {
      this._serviceableNodeIds.splice(index, 1);
      delete this._nodes[node.id];
      this._clearFindCaches();
      node.pool.end();
    }
  }

  _clearFindCaches() {
    this._findCaches = {};
  }
};

var pool_cluster$1 = PoolCluster$1;

const Connection = connection;
const ConnectionConfig = connection_config;

function createConnection(opts) {
  return new Connection({ config: new ConnectionConfig(opts) });
}

var create_connection = createConnection;

const Pool = pool;
const PoolConfig = pool_config;

function createPool(config) {
  return new Pool({ config: new PoolConfig(config) });
}

var create_pool = createPool;

const PoolCluster = pool_cluster$1;

function createPoolCluster(config) {
  return new PoolCluster(config);
}

var create_pool_cluster = createPoolCluster;

const { captureStackHolder } = capture_local_err;
const PromisePoolConnection = pool_connection$1;
const makeDoneCb = make_done_cb;

class PromisePoolNamespace {
  constructor(poolNamespace, thePromise) {
    this.poolNamespace = poolNamespace;
    this.Promise = thePromise || Promise;
  }

  getConnection() {
    const corePoolNamespace = this.poolNamespace;
    return new this.Promise((resolve, reject) => {
      corePoolNamespace.getConnection((err, coreConnection) => {
        if (err) {
          reject(err);
        } else {
          resolve(new PromisePoolConnection(coreConnection, this.Promise));
        }
      });
    });
  }

  query(sql, values) {
    const corePoolNamespace = this.poolNamespace;
    const stackHolder = captureStackHolder(
      PromisePoolNamespace.prototype.query
    );
    if (typeof values === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, stackHolder);
      corePoolNamespace.query(sql, values, done);
    });
  }

  execute(sql, values) {
    const corePoolNamespace = this.poolNamespace;
    const stackHolder = captureStackHolder(
      PromisePoolNamespace.prototype.execute
    );
    if (typeof values === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, stackHolder);
      corePoolNamespace.execute(sql, values, done);
    });
  }
}

var pool_cluster = PromisePoolNamespace;

(function (exports) {

	const SqlString = require$$0$7;
	const EventEmitter = require$$1$2.EventEmitter;
	const parserCache = parser_cache;
	const PoolCluster = pool_cluster$1;
	const createConnection = create_connection;
	const createPool = create_pool;
	const createPoolCluster = create_pool_cluster;
	const PromiseConnection = connection$1;
	const PromisePool = pool$1;
	const {
	  captureStackHolder,
	  applyCapturedStack,
	} = capture_local_err;
	const makeDoneCb = make_done_cb;
	const PromisePoolConnection = pool_connection$1;
	const inheritEvents = inherit_events;
	const PromisePoolNamespace = pool_cluster;

	function createConnectionPromise(opts) {
	  const coreConnection = createConnection(opts);
	  const stackHolder = captureStackHolder(createConnectionPromise);
	  const thePromise = opts.Promise || Promise;
	  if (!thePromise) {
	    throw new Error(
	      'no Promise implementation available.' +
	        'Use promise-enabled node version or pass userland Promise' +
	        " implementation as parameter, for example: { Promise: require('bluebird') }"
	    );
	  }
	  return new thePromise((resolve, reject) => {
	    coreConnection.once('connect', () => {
	      resolve(new PromiseConnection(coreConnection, thePromise));
	    });
	    coreConnection.once('error', (err) => {
	      applyCapturedStack(err, stackHolder);
	      reject(err);
	    });
	  });
	}

	// note: the callback of "changeUser" is not called on success
	// hence there is no possibility to call "resolve"

	function createPromisePool(opts) {
	  const corePool = createPool(opts);
	  const thePromise = opts.Promise || Promise;
	  if (!thePromise) {
	    throw new Error(
	      'no Promise implementation available.' +
	        'Use promise-enabled node version or pass userland Promise' +
	        " implementation as parameter, for example: { Promise: require('bluebird') }"
	    );
	  }

	  return new PromisePool(corePool, thePromise);
	}

	class PromisePoolCluster extends EventEmitter {
	  constructor(poolCluster, thePromise) {
	    super();
	    this.poolCluster = poolCluster;
	    this.Promise = thePromise || Promise;
	    inheritEvents(poolCluster, this, ['warn', 'remove', 'online', 'offline']);
	  }

	  getConnection(pattern, selector) {
	    const corePoolCluster = this.poolCluster;
	    return new this.Promise((resolve, reject) => {
	      corePoolCluster.getConnection(
	        pattern,
	        selector,
	        (err, coreConnection) => {
	          if (err) {
	            reject(err);
	          } else {
	            resolve(new PromisePoolConnection(coreConnection, this.Promise));
	          }
	        }
	      );
	    });
	  }

	  query(sql, args) {
	    const corePoolCluster = this.poolCluster;
	    const stackHolder = captureStackHolder(PromisePoolCluster.prototype.query);
	    if (typeof args === 'function') {
	      throw new Error(
	        'Callback function is not available with promise clients.'
	      );
	    }
	    return new this.Promise((resolve, reject) => {
	      const done = makeDoneCb(resolve, reject, stackHolder);
	      corePoolCluster.query(sql, args, done);
	    });
	  }

	  execute(sql, args) {
	    const corePoolCluster = this.poolCluster;
	    const stackHolder = captureStackHolder(
	      PromisePoolCluster.prototype.execute
	    );
	    if (typeof args === 'function') {
	      throw new Error(
	        'Callback function is not available with promise clients.'
	      );
	    }
	    return new this.Promise((resolve, reject) => {
	      const done = makeDoneCb(resolve, reject, stackHolder);
	      corePoolCluster.execute(sql, args, done);
	    });
	  }

	  of(pattern, selector) {
	    return new PromisePoolNamespace(
	      this.poolCluster.of(pattern, selector),
	      this.Promise
	    );
	  }

	  end() {
	    const corePoolCluster = this.poolCluster;
	    const stackHolder = captureStackHolder(PromisePoolCluster.prototype.end);
	    return new this.Promise((resolve, reject) => {
	      corePoolCluster.end((err) => {
	        if (err) {
	          applyCapturedStack(err, stackHolder);
	          reject(err);
	        } else {
	          resolve();
	        }
	      });
	    });
	  }

	  async [Symbol.asyncDispose]() {
	    if (!this.poolCluster._closed) {
	      await this.end();
	    }
	  }
	}

	/**
	 * proxy poolCluster synchronous functions
	 */
	(function (functionsToWrap) {
	  for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
	    const func = functionsToWrap[i];

	    if (
	      typeof PoolCluster.prototype[func] === 'function' &&
	      PromisePoolCluster.prototype[func] === undefined
	    ) {
	      PromisePoolCluster.prototype[func] = (function factory(funcName) {
	        return function () {
	          return PoolCluster.prototype[funcName].apply(
	            this.poolCluster,
	            arguments
	          );
	        };
	      })(func);
	    }
	  }
	})(['add', 'remove']);

	function createPromisePoolCluster(opts) {
	  const corePoolCluster = createPoolCluster(opts);
	  const thePromise = (opts && opts.Promise) || Promise;
	  if (!thePromise) {
	    throw new Error(
	      'no Promise implementation available.' +
	        'Use promise-enabled node version or pass userland Promise' +
	        " implementation as parameter, for example: { Promise: require('bluebird') }"
	    );
	  }
	  return new PromisePoolCluster(corePoolCluster, thePromise);
	}

	exports.createConnection = createConnectionPromise;
	exports.createPool = createPromisePool;
	exports.createPoolCluster = createPromisePoolCluster;
	exports.escape = SqlString.escape;
	exports.escapeId = SqlString.escapeId;
	exports.format = SqlString.format;
	exports.raw = SqlString.raw;
	exports.Connection = PromiseConnection;
	exports.PoolConnection = PromisePoolConnection;
	exports.PromisePool = PromisePool;
	exports.PromiseConnection = PromiseConnection;
	exports.PromisePoolConnection = PromisePoolConnection;

	exports.__defineGetter__('Types', () => /*@__PURE__*/ requireTypes());

	exports.__defineGetter__('Charsets', () =>
	  /*@__PURE__*/ requireCharsets()
	);

	exports.__defineGetter__('CharsetToEncoding', () =>
	  /*@__PURE__*/ requireCharset_encodings()
	);

	exports.setMaxParserCache = function (max) {
	  parserCache.setMaxCache(max);
	};

	exports.clearParserCache = function () {
	  parserCache.clearCache();
	}; 
} (promise));

const mysql = /*@__PURE__*/getDefaultExportFromCjs(promise);

const _UFvjlOrvbSPvhp6tXx1tmmlRbZbiiBI0sQx5P1vXlU = defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig();
  try {
    const pool = mysql.createPool({
      host: config.mysqlHost,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase
    });
    nitroApp.hooks.hook("request", (event) => {
      event.context.db = pool;
    });
  } catch (e) {
    console.error("Failed to initialize database pool:", e);
  }
});

const plugins = [
  _UFvjlOrvbSPvhp6tXx1tmmlRbZbiiBI0sQx5P1vXlU
];

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

function baseURL() {
	
	return useRuntimeConfig().app.baseURL;
}
function buildAssetsDir() {
	
	return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
	return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
	
	const app = useRuntimeConfig().app;
	const publicBase = app.cdnURL || app.baseURL;
	return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

function parseScope(raw) {
  const upper = (raw != null ? raw : "GLOBAL").toUpperCase();
  return upper === "LOCAL" ? "LOCAL" : "GLOBAL";
}
async function resolveActorContext(event, supabase) {
  var _a;
  const userId = getCookie(event, "user_session");
  const userRole = getCookie(event, "user_role");
  if (!userId || !userRole) {
    throw createError$1({ statusCode: 401, message: "Authentication required." });
  }
  const { data: actorRow, error } = await supabase.from("users").select("org_id, full_name, role").eq("user_id", userId).single();
  if (error || !(actorRow == null ? void 0 : actorRow.org_id)) {
    throw createError$1({
      statusCode: 403,
      message: "Could not resolve authenticated user profile. Please log in again."
    });
  }
  if (String(actorRow.role) !== String(userRole)) {
    throw createError$1({
      statusCode: 403,
      message: "Role mismatch: session cookie does not match database profile."
    });
  }
  return {
    userId,
    userRole,
    orgId: String(actorRow.org_id),
    fullName: (_a = actorRow.full_name) != null ? _a : null
  };
}
async function resolveActorContextWithOffices(event, supabase) {
  const base = await resolveActorContext(event, supabase);
  if (base.userRole !== "employee") {
    return { ...base, officeIds: [] };
  }
  const { data: officeRows, error: officeErr } = await supabase.from("offices").select("id").eq("org_id", base.orgId).eq("assigned_user", base.userId);
  if (officeErr) {
    console.warn("[actorContext] Could not resolve office list:", officeErr.message);
    return { ...base, officeIds: [] };
  }
  const officeIds = (officeRows != null ? officeRows : []).map((o) => String(o.id));
  return { ...base, officeIds };
}

async function extractPdfText(buffer) {
  const { extractText, getDocumentProxy } = await import('./index.mjs');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text != null ? text : "";
}
const extractTextFromFile = async (file) => {
  const filename = file.filename.toLowerCase();
  let text = "";
  try {
    if (filename.endsWith(".pdf")) {
      text = await extractPdfText(file.data);
    } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.data });
      text = result.value;
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      text = `Excel Spreadsheet Document titled: ${file.filename}. Contains structured spreadsheet ledger metrics.`;
    } else {
      text = file.data.toString("utf-8");
    }
  } catch (parseError) {
    console.warn(`Parser failed to read text contents for ${filename}, falling back to metadata description.`);
    text = `Document File Name: ${file.filename}`;
  }
  return text.replace(/\s+/g, " ").trim().substring(0, 4e3);
};

const FALLBACK_ANALYSIS = {
  title: "Untitled Document",
  description: "The document contents could not be automatically analyzed. Please review and update the details manually."
};
const MIME_TO_EXTENSION = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/json": ".json"
};
const resolveExtension = (mimeType) => {
  var _a;
  return MIME_TO_EXTENSION[(_a = mimeType == null ? void 0 : mimeType.toLowerCase) == null ? void 0 : _a.call(mimeType)] || ".txt";
};
const normalizeAnalysis = (raw) => {
  const title = typeof (raw == null ? void 0 : raw.title) === "string" && raw.title.trim() ? raw.title.trim() : FALLBACK_ANALYSIS.title;
  const description = typeof (raw == null ? void 0 : raw.description) === "string" && raw.description.trim() ? raw.description.trim() : FALLBACK_ANALYSIS.description;
  return { title, description };
};
const analyzeDocument = async (text) => {
  var _a, _b;
  const trimmed = (text || "").trim();
  if (!trimmed) return { ...FALLBACK_ANALYSIS };
  try {
    const { default: Groq } = await Promise.resolve().then(function () { return index; });
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 1e3,
      messages: [
        {
          role: "system",
          content: "You analyze documents. Return ONLY a JSON object with two string keys: 'title' and 'description'. The 'title' is a concise, human-readable document title. The 'description' is a precise summary of EXACTLY two sentences. If the content is unreadable, encrypted, or empty, use 'Untitled Document' for title and explain that the content could not be read in the description."
        },
        { role: "user", content: `Document Content:
${trimmed}` }
      ],
      response_format: { type: "json_object" }
    });
    const content = ((_b = (_a = completion.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) || "{}";
    return normalizeAnalysis(JSON.parse(content));
  } catch (error) {
    console.error("[aiAnalyzer] analyzeDocument failed:", error);
    return { ...FALLBACK_ANALYSIS };
  }
};
async function analyzeDocumentBuffer(fileBuffer, mimeType) {
  if (!fileBuffer || !fileBuffer.length) {
    return { ...FALLBACK_ANALYSIS };
  }
  try {
    const extractedText = await extractTextFromFile({
      filename: `document${resolveExtension(mimeType)}`,
      data: fileBuffer
    });
    const context = (extractedText == null ? void 0 : extractedText.trim()) || "";
    if (!context) return { ...FALLBACK_ANALYSIS };
    return await analyzeDocument(context);
  } catch (error) {
    console.error("[aiAnalyzer] analyzeDocumentBuffer failed:", error);
    return { ...FALLBACK_ANALYSIS };
  }
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
function encodeFilterValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  const str = String(value);
  if (/^[0-9a-f-]{36}$/i.test(str) || /^[A-Z0-9_]+$/.test(str)) return str;
  return `"${str.replace(/"/g, '\\"')}"`;
}
class PostgrestQueryBuilder {
  constructor(baseUrl, table, headers) {
    __publicField(this, "baseUrl", baseUrl);
    __publicField(this, "table", table);
    __publicField(this, "headers", headers);
    __publicField(this, "method", "GET");
    __publicField(this, "selectColumns", "*");
    __publicField(this, "filters", []);
    __publicField(this, "orders", []);
    __publicField(this, "limitValue");
    __publicField(this, "body");
    __publicField(this, "wantSingle", false);
    __publicField(this, "wantMaybeSingle", false);
    __publicField(this, "countMode");
    __publicField(this, "headOnly", false);
    __publicField(this, "returning", false);
  }
  select(columns = "*", options) {
    this.selectColumns = columns;
    if (options == null ? void 0 : options.count) this.countMode = options.count;
    if (options == null ? void 0 : options.head) this.headOnly = true;
    return this;
  }
  insert(payload) {
    this.method = "POST";
    this.body = payload;
    return this;
  }
  update(payload) {
    this.method = "PATCH";
    this.body = payload;
    return this;
  }
  delete() {
    this.method = "DELETE";
    return this;
  }
  eq(column, value) {
    this.filters.push(`${column}=eq.${encodeFilterValue(value)}`);
    return this;
  }
  neq(column, value) {
    this.filters.push(`${column}=neq.${encodeFilterValue(value)}`);
    return this;
  }
  in(column, values) {
    const encoded = values.map(encodeFilterValue).join(",");
    this.filters.push(`${column}=in.(${encoded})`);
    return this;
  }
  or(expression) {
    this.filters.push(`or=(${expression})`);
    return this;
  }
  is(column, value) {
    this.filters.push(`${column}=is.${encodeFilterValue(value)}`);
    return this;
  }
  ilike(column, pattern) {
    this.filters.push(`${column}=ilike.${encodeFilterValue(pattern)}`);
    return this;
  }
  order(column, options = {}) {
    this.orders.push(`${column}.${options.ascending === false ? "desc" : "asc"}`);
    return this;
  }
  limit(count) {
    this.limitValue = count;
    return this;
  }
  single() {
    this.wantSingle = true;
    return this.execute();
  }
  maybeSingle() {
    this.wantMaybeSingle = true;
    return this.execute();
  }
  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
  markReturning() {
    this.returning = true;
  }
  buildUrl() {
    const params = new URLSearchParams();
    if (this.method === "GET" || this.returning || this.method === "PATCH" || this.method === "DELETE") {
      params.set("select", this.selectColumns);
    }
    for (const filter of this.filters) {
      const idx = filter.indexOf("=");
      if (idx === -1) continue;
      params.append(filter.slice(0, idx), filter.slice(idx + 1));
    }
    for (const order of this.orders) params.append("order", order);
    if (this.limitValue != null) params.set("limit", String(this.limitValue));
    const qs = params.toString();
    return `${this.baseUrl}/rest/v1/${this.table}${qs ? `?${qs}` : ""}`;
  }
  buildHeaders() {
    const reqHeaders = {
      ...this.headers,
      "Content-Type": "application/json"
    };
    const prefer = [];
    if (this.countMode) prefer.push(`count=${this.countMode}`);
    if (this.returning) prefer.push("return=representation");
    else if (this.method === "POST" || this.method === "PATCH") prefer.push("return=minimal");
    if (prefer.length) reqHeaders.Prefer = prefer.join(",");
    if (this.wantSingle || this.wantMaybeSingle) {
      reqHeaders.Accept = "application/vnd.pgrst.object+json";
    }
    return reqHeaders;
  }
  async execute() {
    var _a, _b;
    if (this.method === "POST" && (this.wantSingle || this.wantMaybeSingle || this.selectColumns !== "*")) {
      this.markReturning();
    }
    if (this.method === "PATCH" || this.method === "DELETE") {
      if (this.selectColumns !== "*" || this.wantSingle || this.wantMaybeSingle) this.markReturning();
    }
    const url = this.buildUrl();
    const reqHeaders = this.buildHeaders();
    try {
      const response = await $fetch.raw(url, {
        method: this.method,
        headers: reqHeaders,
        body: this.method === "GET" ? void 0 : this.body,
        ignoreResponseError: true
      });
      const countHeader = response.headers.get("content-range");
      let count = null;
      if (countHeader) {
        const match = countHeader.match(/\/(\d+)$/);
        if (match) count = Number(match[1]);
      }
      if (response.status >= 400) {
        const errBody = (_a = response._data) != null ? _a : {};
        const error = {
          message: errBody.message || `Request failed with status ${response.status}`,
          code: errBody.code,
          details: errBody.details,
          hint: errBody.hint
        };
        if (this.wantMaybeSingle && (response.status === 406 || response.status === 404)) {
          return { data: null, error: null, count };
        }
        return { data: null, error, count };
      }
      if (this.headOnly) {
        return { data: null, error: null, count };
      }
      const data = (_b = response._data) != null ? _b : null;
      if (this.wantMaybeSingle && (data === null || Array.isArray(data) && data.length === 0)) {
        return { data: null, error: null, count };
      }
      if (this.wantSingle && Array.isArray(data) && data.length === 0) {
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, count };
      }
      if (!this.wantSingle && !this.wantMaybeSingle && data === null && (this.method === "POST" || this.method === "PATCH" || this.method === "DELETE")) {
        return { data: null, error: null, count };
      }
      return { data, error: null, count };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown fetch error";
      return { data: null, error: { message } };
    }
  }
}
async function broadcastMessage(baseUrl, apiKey, channelName, event, payload) {
  await $fetch(`${baseUrl}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: {
      messages: [{ topic: channelName, event, payload }]
    }
  });
}
const useServerSupabase = () => {
  const config = useRuntimeConfig();
  const supabaseUrl = String(config.public.supabaseUrl || "").replace(/\/$/, "");
  const supabaseKey = String(config.supabaseServiceKey || "");
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`
  };
  return {
    from: (table) => new PostgrestQueryBuilder(supabaseUrl, table, headers),
    /** @deprecated Use broadcastMessage via documentIssues helper instead */
    channel: (channelName) => ({
      subscribe: async () => {
      },
      send: async (msg) => {
        if (msg.type === "broadcast") {
          await broadcastMessage(supabaseUrl, supabaseKey, channelName, msg.event, msg.payload);
        }
      }
    }),
    removeChannel: async () => {
    },
    broadcast: (channelName, event, payload) => broadcastMessage(supabaseUrl, supabaseKey, channelName, event, payload)
  };
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = ["client", "employee"];
const MEMORY_WINDOW = 5;
async function resolveTenant(event) {
  const userId = getCookie(event, "user_session");
  const userRole = getCookie(event, "user_role");
  if (!userId || !userRole || !ALLOWED_ROLES.includes(userRole)) {
    throw createError$1({
      statusCode: 401,
      statusMessage: "Unauthenticated: a valid client or employee session is required."
    });
  }
  const client = useServerSupabase();
  const { data: sessionUser, error } = await client.from("users").select("org_id").eq("user_id", userId).single();
  const orgId = (sessionUser == null ? void 0 : sessionUser.org_id) ? String(sessionUser.org_id) : null;
  if (error || !orgId || !UUID_REGEX.test(orgId)) {
    throw createError$1({
      statusCode: 403,
      statusMessage: "Forbidden: no valid organization scope is bound to this session."
    });
  }
  return { userId, orgId, role: userRole };
}
async function ensureSession(sessionId, orgId, userId, title, event) {
  const client = useServerSupabase();
  if (sessionId && UUID_REGEX.test(sessionId)) {
    const { data: owned } = await client.from("chat_sessions").select("id").eq("id", sessionId).eq("user_id", String(userId)).maybeSingle();
    if (owned == null ? void 0 : owned.id) {
      return owned.id;
    }
  }
  const newId = randomUUID();
  const sessionTitle = (title || "New chat").trim().slice(0, 60) || "New chat";
  const { error } = await client.from("chat_sessions").insert({
    id: newId,
    org_id: String(orgId),
    user_id: String(userId),
    title: sessionTitle,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) {
    console.error("Postgres Insertion Error Details:", error);
    throw createError$1({
      statusCode: 500,
      statusMessage: `Failed to provision chat session: ${error.message}`
    });
  }
  return newId;
}
async function fetchRecentMessages(sessionId, event, limit = MEMORY_WINDOW) {
  const client = useServerSupabase();
  const { data, error } = await client.from("chat_messages").select("role, content, metadata, created_at").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(limit);
  if (error || !data) {
    return [];
  }
  return data.slice().reverse();
}
async function persistMessage(sessionId, role, content, event, metadata = null) {
  const client = useServerSupabase();
  const messageId = randomUUID();
  const normalizedRole = String(role).toLowerCase() === "assistant" ? "assistant" : "user";
  const payload = {
    id: messageId,
    session_id: sessionId,
    role: normalizedRole,
    content: typeof content === "string" ? content : String(content != null ? content : ""),
    metadata: metadata != null ? metadata : null,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { error } = await client.from("chat_messages").insert(payload);
  if (error) {
    console.error("Postgres Insertion Error Details:", error);
    throw createError$1({
      statusCode: 500,
      statusMessage: `Failed to persist chat message: ${error.message}`
    });
  }
  return messageId;
}
async function listSessions(userId, event) {
  const client = useServerSupabase();
  const { data, error } = await client.from("chat_sessions").select("id, title, created_at").eq("user_id", String(userId)).order("created_at", { ascending: false }).limit(50);
  if (error) {
    throw createError$1({
      statusCode: 500,
      statusMessage: `Failed to load chat sessions: ${error.message}`
    });
  }
  return data != null ? data : [];
}
async function fetchLatestDocumentPayload(sessionId, event) {
  var _a;
  const client = useServerSupabase();
  const { data, error } = await client.from("chat_messages").select("metadata, created_at").eq("session_id", sessionId).eq("role", "assistant").order("created_at", { ascending: false }).limit(15);
  if (error || !data) {
    return null;
  }
  for (const row of data) {
    const dp = (_a = row == null ? void 0 : row.metadata) == null ? void 0 : _a.documentPayload;
    if (dp == null ? void 0 : dp.htmlContent) {
      return {
        title: String(dp.title || "Document"),
        htmlContent: String(dp.htmlContent)
      };
    }
  }
  return null;
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (typeof state === "function" ? receiver !== state || true : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * https://stackoverflow.com/a/2117523
 */
let uuid4 = function () {
    const { crypto } = globalThis;
    if (crypto?.randomUUID) {
        uuid4 = crypto.randomUUID.bind(crypto);
        return crypto.randomUUID();
    }
    const u8 = new Uint8Array(1);
    const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => (Math.random() * 0xff) & 0xff;
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (randomByte() & (15 >> (+c / 4)))).toString(16));
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
function isAbortError(err) {
    return (typeof err === 'object' &&
        err !== null &&
        // Spec-compliant fetch implementations
        (('name' in err && err.name === 'AbortError') ||
            // Expo fetch
            ('message' in err && String(err.message).includes('FetchRequestCanceledException'))));
}
const castToError = (err) => {
    if (err instanceof Error)
        return err;
    if (typeof err === 'object' && err !== null) {
        try {
            if (Object.prototype.toString.call(err) === '[object Error]') {
                // @ts-ignore - not all envs have native support for cause yet
                const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
                if (err.stack)
                    error.stack = err.stack;
                // @ts-ignore - not all envs have native support for cause yet
                if (err.cause && !error.cause)
                    error.cause = err.cause;
                if (err.name)
                    error.name = err.name;
                return error;
            }
        }
        catch { }
        try {
            return new Error(JSON.stringify(err));
        }
        catch { }
    }
    return new Error(err);
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class GroqError extends Error {
}
class APIError extends GroqError {
    constructor(status, error, message, headers) {
        super(`${APIError.makeMessage(status, error, message)}`);
        this.status = status;
        this.headers = headers;
        this.error = error;
    }
    static makeMessage(status, error, message) {
        const msg = error?.message ?
            typeof error.message === 'string' ?
                error.message
                : JSON.stringify(error.message)
            : error ? JSON.stringify(error)
                : message;
        if (status && msg) {
            return `${status} ${msg}`;
        }
        if (status) {
            return `${status} status code (no body)`;
        }
        if (msg) {
            return msg;
        }
        return '(no status code or body)';
    }
    static generate(status, errorResponse, message, headers) {
        if (!status || !headers) {
            return new APIConnectionError({ message, cause: castToError(errorResponse) });
        }
        const error = errorResponse;
        if (status === 400) {
            return new BadRequestError(status, error, message, headers);
        }
        if (status === 401) {
            return new AuthenticationError(status, error, message, headers);
        }
        if (status === 403) {
            return new PermissionDeniedError(status, error, message, headers);
        }
        if (status === 404) {
            return new NotFoundError(status, error, message, headers);
        }
        if (status === 409) {
            return new ConflictError(status, error, message, headers);
        }
        if (status === 422) {
            return new UnprocessableEntityError(status, error, message, headers);
        }
        if (status === 429) {
            return new RateLimitError(status, error, message, headers);
        }
        if (status >= 500) {
            return new InternalServerError(status, error, message, headers);
        }
        return new APIError(status, error, message, headers);
    }
}
class APIUserAbortError extends APIError {
    constructor({ message } = {}) {
        super(undefined, undefined, message || 'Request was aborted.', undefined);
    }
}
class APIConnectionError extends APIError {
    constructor({ message, cause }) {
        super(undefined, undefined, message || 'Connection error.', undefined);
        // in some environments the 'cause' property is already declared
        // @ts-ignore
        if (cause)
            this.cause = cause;
    }
}
class APIConnectionTimeoutError extends APIConnectionError {
    constructor({ message } = {}) {
        super({ message: message ?? 'Request timed out.' });
    }
}
class BadRequestError extends APIError {
}
class AuthenticationError extends APIError {
}
class PermissionDeniedError extends APIError {
}
class NotFoundError extends APIError {
}
class ConflictError extends APIError {
}
class UnprocessableEntityError extends APIError {
}
class RateLimitError extends APIError {
}
class InternalServerError extends APIError {
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
// https://url.spec.whatwg.org/#url-scheme-string
const startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
const isAbsoluteURL = (url) => {
    return startsWithSchemeRegexp.test(url);
};
let isArray = (val) => ((isArray = Array.isArray), isArray(val));
let isReadonlyArray = isArray;
// https://stackoverflow.com/a/34491287
function isEmptyObj(obj) {
    if (!obj)
        return true;
    for (const _k in obj)
        return false;
    return true;
}
// https://eslint.org/docs/latest/rules/no-prototype-builtins
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
const validatePositiveInteger = (name, n) => {
    if (typeof n !== 'number' || !Number.isInteger(n)) {
        throw new GroqError(`${name} must be an integer`);
    }
    if (n < 0) {
        throw new GroqError(`${name} must be a positive integer`);
    }
    return n;
};
const safeJSON = (text) => {
    try {
        return JSON.parse(text);
    }
    catch (err) {
        return undefined;
    }
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const VERSION = '1.2.1'; // x-release-please-version

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
const isRunningInBrowser = () => {
    return (
    // @ts-ignore
    "undefined" !== 'undefined');
};
/**
 * Note this does not detect 'browser'; for that, use getBrowserInfo().
 */
function getDetectedPlatform() {
    if (typeof Deno !== 'undefined' && Deno.build != null) {
        return 'deno';
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return 'edge';
    }
    if (Object.prototype.toString.call(typeof globalThis.process !== 'undefined' ? globalThis.process : 0) === '[object process]') {
        return 'node';
    }
    return 'unknown';
}
const getPlatformProperties = () => {
    const detectedPlatform = getDetectedPlatform();
    if (detectedPlatform === 'deno') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': normalizePlatform(Deno.build.os),
            'X-Stainless-Arch': normalizeArch(Deno.build.arch),
            'X-Stainless-Runtime': 'deno',
            'X-Stainless-Runtime-Version': typeof Deno.version === 'string' ? Deno.version : Deno.version?.deno ?? 'unknown',
        };
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': `other:${EdgeRuntime}`,
            'X-Stainless-Runtime': 'edge',
            'X-Stainless-Runtime-Version': process.version,
        };
    }
    // Check if Node.js
    if (detectedPlatform === 'node') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': normalizePlatform(process.platform ?? 'unknown'),
            'X-Stainless-Arch': normalizeArch(process.arch ?? 'unknown'),
            'X-Stainless-Runtime': 'node',
            'X-Stainless-Runtime-Version': process.version ?? 'unknown',
        };
    }
    const browserInfo = getBrowserInfo();
    if (browserInfo) {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': 'unknown',
            'X-Stainless-Runtime': `browser:${browserInfo.browser}`,
            'X-Stainless-Runtime-Version': browserInfo.version,
        };
    }
    // TODO add support for Cloudflare workers, etc.
    return {
        'X-Stainless-Lang': 'js',
        'X-Stainless-Package-Version': VERSION,
        'X-Stainless-OS': 'Unknown',
        'X-Stainless-Arch': 'unknown',
        'X-Stainless-Runtime': 'unknown',
        'X-Stainless-Runtime-Version': 'unknown',
    };
};
// Note: modified from https://github.com/JS-DevTools/host-environment/blob/b1ab79ecde37db5d6e163c050e54fe7d287d7c92/src/isomorphic.browser.ts
function getBrowserInfo() {
    if (typeof navigator === 'undefined' || !navigator) {
        return null;
    }
    // NOTE: The order matters here!
    const browserPatterns = [
        { key: 'edge', pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'ie', pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'ie', pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'chrome', pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'firefox', pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'safari', pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ },
    ];
    // Find the FIRST matching browser
    for (const { key, pattern } of browserPatterns) {
        const match = pattern.exec(navigator.userAgent);
        if (match) {
            const major = match[1] || 0;
            const minor = match[2] || 0;
            const patch = match[3] || 0;
            return { browser: key, version: `${major}.${minor}.${patch}` };
        }
    }
    return null;
}
const normalizeArch = (arch) => {
    // Node docs:
    // - https://nodejs.org/api/process.html#processarch
    // Deno docs:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    if (arch === 'x32')
        return 'x32';
    if (arch === 'x86_64' || arch === 'x64')
        return 'x64';
    if (arch === 'arm')
        return 'arm';
    if (arch === 'aarch64' || arch === 'arm64')
        return 'arm64';
    if (arch)
        return `other:${arch}`;
    return 'unknown';
};
const normalizePlatform = (platform) => {
    // Node platforms:
    // - https://nodejs.org/api/process.html#processplatform
    // Deno platforms:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    // - https://github.com/denoland/deno/issues/14799
    platform = platform.toLowerCase();
    // NOTE: this iOS check is untested and may not work
    // Node does not work natively on IOS, there is a fork at
    // https://github.com/nodejs-mobile/nodejs-mobile
    // however it is unknown at the time of writing how to detect if it is running
    if (platform.includes('ios'))
        return 'iOS';
    if (platform === 'android')
        return 'Android';
    if (platform === 'darwin')
        return 'MacOS';
    if (platform === 'win32')
        return 'Windows';
    if (platform === 'freebsd')
        return 'FreeBSD';
    if (platform === 'openbsd')
        return 'OpenBSD';
    if (platform === 'linux')
        return 'Linux';
    if (platform)
        return `Other:${platform}`;
    return 'Unknown';
};
let _platformHeaders;
const getPlatformHeaders = () => {
    return (_platformHeaders ?? (_platformHeaders = getPlatformProperties()));
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
function getDefaultFetch() {
    if (typeof fetch !== 'undefined') {
        return fetch;
    }
    throw new Error('`fetch` is not defined as a global; Either pass `fetch` to the client, `new Groq({ fetch })` or polyfill the global, `globalThis.fetch = fetch`');
}
function makeReadableStream(...args) {
    const ReadableStream = globalThis.ReadableStream;
    if (typeof ReadableStream === 'undefined') {
        // Note: All of the platforms / runtimes we officially support already define
        // `ReadableStream` as a global, so this should only ever be hit on unsupported runtimes.
        throw new Error('`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`');
    }
    return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
    let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
    return makeReadableStream({
        start() { },
        async pull(controller) {
            const { done, value } = await iter.next();
            if (done) {
                controller.close();
            }
            else {
                controller.enqueue(value);
            }
        },
        async cancel() {
            await iter.return?.();
        },
    });
}
/**
 * Most browsers don't yet have async iterable support for ReadableStream,
 * and Node has a very different way of reading bytes from its "ReadableStream".
 *
 * This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
function ReadableStreamToAsyncIterable(stream) {
    if (stream[Symbol.asyncIterator])
        return stream;
    const reader = stream.getReader();
    return {
        async next() {
            try {
                const result = await reader.read();
                if (result?.done)
                    reader.releaseLock(); // release lock when stream becomes closed
                return result;
            }
            catch (e) {
                reader.releaseLock(); // release lock when stream becomes errored
                throw e;
            }
        },
        async return() {
            const cancelPromise = reader.cancel();
            reader.releaseLock();
            await cancelPromise;
            return { done: true, value: undefined };
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };
}
/**
 * Cancels a ReadableStream we don't need to consume.
 * See https://undici.nodejs.org/#/?id=garbage-collection
 */
async function CancelReadableStream(stream) {
    if (stream === null || typeof stream !== 'object')
        return;
    if (stream[Symbol.asyncIterator]) {
        await stream[Symbol.asyncIterator]().return?.();
        return;
    }
    const reader = stream.getReader();
    const cancelPromise = reader.cancel();
    reader.releaseLock();
    await cancelPromise;
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
const FallbackEncoder = ({ headers, body }) => {
    return {
        bodyHeaders: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    };
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * Basic re-implementation of `qs.stringify` for primitive types.
 */
function stringifyQuery(query) {
    return Object.entries(query)
        .filter(([_, value]) => typeof value !== 'undefined')
        .map(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
        if (value === null) {
            return `${encodeURIComponent(key)}=`;
        }
        throw new GroqError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    })
        .join('&');
}

const checkFileSupport = () => {
    if (typeof File === 'undefined') {
        const { process } = globalThis;
        const isOldNode = typeof process?.versions?.node === 'string' && parseInt(process.versions.node.split('.')) < 20;
        throw new Error('`File` is not defined as a global, which is required for file uploads.' +
            (isOldNode ?
                " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`."
                : ''));
    }
};
/**
 * Construct a `File` instance. This is used to ensure a helpful error is thrown
 * for environments that don't define a global `File` yet.
 */
function makeFile(fileBits, fileName, options) {
    checkFileSupport();
    return new File(fileBits, fileName ?? 'unknown_file', options);
}
function getName(value) {
    return (((typeof value === 'object' &&
        value !== null &&
        (('name' in value && value.name && String(value.name)) ||
            ('url' in value && value.url && String(value.url)) ||
            ('filename' in value && value.filename && String(value.filename)) ||
            ('path' in value && value.path && String(value.path)))) ||
        '')
        .split(/[\\/]/)
        .pop() || undefined);
}
const isAsyncIterable = (value) => value != null && typeof value === 'object' && typeof value[Symbol.asyncIterator] === 'function';
const multipartFormRequestOptions = async (opts, fetch) => {
    return { ...opts, body: await createForm(opts.body, fetch) };
};
const supportsFormDataMap = /* @__PURE__ */ new WeakMap();
/**
 * node-fetch doesn't support the global FormData object in recent node versions. Instead of sending
 * properly-encoded form data, it just stringifies the object, resulting in a request body of "[object FormData]".
 * This function detects if the fetch function provided supports the global FormData object to avoid
 * confusing error messages later on.
 */
function supportsFormData(fetchObject) {
    const fetch = typeof fetchObject === 'function' ? fetchObject : fetchObject.fetch;
    const cached = supportsFormDataMap.get(fetch);
    if (cached)
        return cached;
    const promise = (async () => {
        try {
            const FetchResponse = ('Response' in fetch ?
                fetch.Response
                : (await fetch('data:,')).constructor);
            const data = new FormData();
            if (data.toString() === (await new FetchResponse(data).text())) {
                return false;
            }
            return true;
        }
        catch {
            // avoid false negatives
            return true;
        }
    })();
    supportsFormDataMap.set(fetch, promise);
    return promise;
}
const createForm = async (body, fetch) => {
    if (!(await supportsFormData(fetch))) {
        throw new TypeError('The provided fetch function does not support file uploads with the current global FormData class.');
    }
    const form = new FormData();
    await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
    return form;
};
// We check for Blob not File because Bun.File doesn't inherit from File,
// but they both inherit from Blob and have a `name` property at runtime.
const isNamedBlob = (value) => value instanceof Blob && 'name' in value;
const addFormValue = async (form, key, value) => {
    if (value === undefined)
        return;
    if (value == null) {
        throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
    }
    // TODO: make nested formats configurable
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        form.append(key, String(value));
    }
    else if (value instanceof Response) {
        form.append(key, makeFile([await value.blob()], getName(value)));
    }
    else if (isAsyncIterable(value)) {
        form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
    }
    else if (isNamedBlob(value)) {
        form.append(key, value, getName(value));
    }
    else if (Array.isArray(value)) {
        await Promise.all(value.map((entry) => addFormValue(form, key + '[]', entry)));
    }
    else if (typeof value === 'object') {
        await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
    }
    else {
        throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
    }
};

/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */
const isBlobLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.size === 'number' &&
    typeof value.type === 'string' &&
    typeof value.text === 'function' &&
    typeof value.slice === 'function' &&
    typeof value.arrayBuffer === 'function';
/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */
const isFileLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    typeof value.lastModified === 'number' &&
    isBlobLike(value);
const isResponseLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.url === 'string' &&
    typeof value.blob === 'function';
/**
 * Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
 * @param value the raw content of the file. Can be an {@link Uploadable}, BlobLikePart, or AsyncIterable of BlobLikeParts
 * @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
 * @param {Object=} options additional properties
 * @param {string=} options.type the MIME type of the content
 * @param {number=} options.lastModified the last modified timestamp
 * @returns a {@link File} with the given properties
 */
async function toFile(value, name, options) {
    checkFileSupport();
    // If it's a promise, resolve it.
    value = await value;
    // If we've been given a `File` we don't need to do anything
    if (isFileLike(value)) {
        if (value instanceof File) {
            return value;
        }
        return makeFile([await value.arrayBuffer()], value.name);
    }
    if (isResponseLike(value)) {
        const blob = await value.blob();
        name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
        return makeFile(await getBytes(blob), name, options);
    }
    const parts = await getBytes(value);
    name || (name = getName(value));
    if (!options?.type) {
        const type = parts.find((part) => typeof part === 'object' && 'type' in part && part.type);
        if (typeof type === 'string') {
            options = { ...options, type };
        }
    }
    return makeFile(parts, name, options);
}
async function getBytes(value) {
    let parts = [];
    if (typeof value === 'string' ||
        ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
        value instanceof ArrayBuffer) {
        parts.push(value);
    }
    else if (isBlobLike(value)) {
        parts.push(value instanceof Blob ? value : await value.arrayBuffer());
    }
    else if (isAsyncIterable(value) // includes Readable, ReadableStream, etc.
    ) {
        for await (const chunk of value) {
            parts.push(...(await getBytes(chunk))); // TODO, consider validating?
        }
    }
    else {
        const constructor = value?.constructor?.name;
        throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ''}${propsForError(value)}`);
    }
    return parts;
}
function propsForError(value) {
    if (typeof value !== 'object' || value === null)
        return '';
    const props = Object.getOwnPropertyNames(value);
    return `; props: [${props.map((p) => `"${p}"`).join(', ')}]`;
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class APIResource {
    constructor(client) {
        this._client = client;
    }
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
const brand_privateNullableHeaders = /* @__PURE__ */ Symbol('brand.privateNullableHeaders');
function* iterateHeaders(headers) {
    if (!headers)
        return;
    if (brand_privateNullableHeaders in headers) {
        const { values, nulls } = headers;
        yield* values.entries();
        for (const name of nulls) {
            yield [name, null];
        }
        return;
    }
    let shouldClear = false;
    let iter;
    if (headers instanceof Headers) {
        iter = headers.entries();
    }
    else if (isReadonlyArray(headers)) {
        iter = headers;
    }
    else {
        shouldClear = true;
        iter = Object.entries(headers ?? {});
    }
    for (let row of iter) {
        const name = row[0];
        if (typeof name !== 'string')
            throw new TypeError('expected header name to be a string');
        const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
        let didClear = false;
        for (const value of values) {
            if (value === undefined)
                continue;
            // Objects keys always overwrite older headers, they never append.
            // Yield a null to clear the header before adding the new values.
            if (shouldClear && !didClear) {
                didClear = true;
                yield [name, null];
            }
            yield [name, value];
        }
    }
}
const buildHeaders = (newHeaders) => {
    const targetHeaders = new Headers();
    const nullHeaders = new Set();
    for (const headers of newHeaders) {
        const seenHeaders = new Set();
        for (const [name, value] of iterateHeaders(headers)) {
            const lowerName = name.toLowerCase();
            if (!seenHeaders.has(lowerName)) {
                targetHeaders.delete(name);
                seenHeaders.add(lowerName);
            }
            if (value === null) {
                targetHeaders.delete(name);
                nullHeaders.add(lowerName);
            }
            else {
                targetHeaders.append(name, value);
                nullHeaders.delete(lowerName);
            }
        }
    }
    return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Speech extends APIResource {
    /**
     * Generates audio from the input text.
     *
     * @example
     * ```ts
     * const speech = await client.audio.speech.create({
     *   input: 'The quick brown fox jumped over the lazy dog',
     *   model: 'playai-tts',
     *   voice: 'Fritz-PlayAI',
     * });
     *
     * const content = await speech.blob();
     * console.log(content);
     * ```
     */
    create(body, options) {
        return this._client.post('/openai/v1/audio/speech', {
            body,
            ...options,
            headers: buildHeaders([{ Accept: 'audio/wav' }, options?.headers]),
            __binaryResponse: true,
        });
    }
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Transcriptions extends APIResource {
    /**
     * Transcribes audio into the input language.
     *
     * @example
     * ```ts
     * const transcription =
     *   await client.audio.transcriptions.create({
     *     model: 'whisper-large-v3-turbo',
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/openai/v1/audio/transcriptions', multipartFormRequestOptions({ body, ...options }, this._client));
    }
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Translations extends APIResource {
    /**
     * Translates audio into English.
     *
     * @example
     * ```ts
     * const translation = await client.audio.translations.create({
     *   model: 'whisper-large-v3-turbo',
     * });
     * ```
     */
    create(body, options) {
        return this._client.post('/openai/v1/audio/translations', multipartFormRequestOptions({ body, ...options }, this._client));
    }
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Audio extends APIResource {
    constructor() {
        super(...arguments);
        this.speech = new Speech(this._client);
        this.transcriptions = new Transcriptions(this._client);
        this.translations = new Translations(this._client);
    }
}
Audio.Speech = Speech;
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;

/**
 * Percent-encode everything that isn't safe to have in a path without encoding safe chars.
 *
 * Taken from https://datatracker.ietf.org/doc/html/rfc3986#section-3.3:
 * > unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
 * > sub-delims  = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
 * > pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
 */
function encodeURIPath(str) {
    return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
const createPathTagFunction = (pathEncoder = encodeURIPath) => function path(statics, ...params) {
    // If there are no params, no processing is needed.
    if (statics.length === 1)
        return statics[0];
    let postPath = false;
    const invalidSegments = [];
    const path = statics.reduce((previousValue, currentValue, index) => {
        if (/[?#]/.test(currentValue)) {
            postPath = true;
        }
        const value = params[index];
        let encoded = (postPath ? encodeURIComponent : pathEncoder)('' + value);
        if (index !== params.length &&
            (value == null ||
                (typeof value === 'object' &&
                    // handle values from other realms
                    value.toString ===
                        Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)
                            ?.toString))) {
            encoded = value + '';
            invalidSegments.push({
                start: previousValue.length + currentValue.length,
                length: encoded.length,
                error: `Value of type ${Object.prototype.toString
                    .call(value)
                    .slice(8, -1)} is not a valid path parameter`,
            });
        }
        return previousValue + currentValue + (index === params.length ? '' : encoded);
    }, '');
    const pathOnly = path.split(/[?#]/, 1)[0];
    const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
    let match;
    // Find all invalid segments
    while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
        invalidSegments.push({
            start: match.index,
            length: match[0].length,
            error: `Value "${match[0]}" can\'t be safely passed as a path parameter`,
        });
    }
    invalidSegments.sort((a, b) => a.start - b.start);
    if (invalidSegments.length > 0) {
        let lastEnd = 0;
        const underline = invalidSegments.reduce((acc, segment) => {
            const spaces = ' '.repeat(segment.start - lastEnd);
            const arrows = '^'.repeat(segment.length);
            lastEnd = segment.start + segment.length;
            return acc + spaces + arrows;
        }, '');
        throw new GroqError(`Path parameters result in path with invalid segments:\n${invalidSegments
            .map((e) => e.error)
            .join('\n')}\n${path}\n${underline}`);
    }
    return path;
};
/**
 * URI-encodes path params and ensures no unsafe /./ or /../ path segments are introduced.
 */
const path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Batches extends APIResource {
    /**
     * Creates and executes a batch from an uploaded file of requests.
     * [Learn more](/docs/batch).
     */
    create(body, options) {
        return this._client.post('/openai/v1/batches', { body, ...options });
    }
    /**
     * Retrieves a batch.
     */
    retrieve(batchID, options) {
        return this._client.get(path `/openai/v1/batches/${batchID}`, options);
    }
    /**
     * List your organization's batches.
     */
    list(options) {
        return this._client.get('/openai/v1/batches', options);
    }
    /**
     * Cancels a batch.
     */
    cancel(batchID, options) {
        return this._client.post(path `/openai/v1/batches/${batchID}/cancel`, options);
    }
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
let Completions$1 = class Completions extends APIResource {
    create(body, options) {
        return this._client.post('/openai/v1/chat/completions', {
            body,
            ...options,
            stream: body.stream ?? false,
        });
    }
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Chat extends APIResource {
    constructor() {
        super(...arguments);
        this.completions = new Completions$1(this._client);
    }
}
Chat.Completions = Completions$1;

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Completions extends APIResource {
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Embeddings extends APIResource {
    /**
     * Creates an embedding vector representing the input text.
     *
     * @example
     * ```ts
     * const createEmbeddingResponse =
     *   await client.embeddings.create({
     *     input: 'The quick brown fox jumped over the lazy dog',
     *     model: 'nomic-embed-text-v1_5',
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/openai/v1/embeddings', { body, ...options });
    }
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Files extends APIResource {
    /**
     * Upload a file that can be used across various endpoints.
     *
     * The Batch API only supports `.jsonl` files up to 100 MB in size. The input also
     * has a specific required [format](/docs/batch).
     *
     * Please contact us if you need to increase these storage limits.
     */
    create(body, options) {
        return this._client.post('/openai/v1/files', multipartFormRequestOptions({ body, ...options }, this._client));
    }
    /**
     * Returns a list of files.
     */
    list(options) {
        return this._client.get('/openai/v1/files', options);
    }
    /**
     * Delete a file.
     */
    delete(fileID, options) {
        return this._client.delete(path `/openai/v1/files/${fileID}`, options);
    }
    /**
     * Returns the contents of the specified file.
     */
    content(fileID, options) {
        return this._client.get(path `/openai/v1/files/${fileID}/content`, {
            ...options,
            headers: buildHeaders([{ Accept: 'application/octet-stream' }, options?.headers]),
            __binaryResponse: true,
        });
    }
    /**
     * Returns information about a file.
     */
    info(fileID, options) {
        return this._client.get(path `/openai/v1/files/${fileID}`, options);
    }
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class Models extends APIResource {
    /**
     * Get a specific model
     */
    retrieve(model, options) {
        return this._client.get(path `/openai/v1/models/${model}`, options);
    }
    /**
     * get all available models
     */
    list(options) {
        return this._client.get('/openai/v1/models', options);
    }
    /**
     * Delete a model
     */
    delete(model, options) {
        return this._client.delete(path `/openai/v1/models/${model}`, options);
    }
}

function concatBytes(buffers) {
    let length = 0;
    for (const buffer of buffers) {
        length += buffer.length;
    }
    const output = new Uint8Array(length);
    let index = 0;
    for (const buffer of buffers) {
        output.set(buffer, index);
        index += buffer.length;
    }
    return output;
}
let encodeUTF8_;
function encodeUTF8(str) {
    let encoder;
    return (encodeUTF8_ ??
        ((encoder = new globalThis.TextEncoder()), (encodeUTF8_ = encoder.encode.bind(encoder))))(str);
}
let decodeUTF8_;
function decodeUTF8(bytes) {
    let decoder;
    return (decodeUTF8_ ??
        ((decoder = new globalThis.TextDecoder()), (decodeUTF8_ = decoder.decode.bind(decoder))))(bytes);
}

var _LineDecoder_buffer, _LineDecoder_carriageReturnIndex;
/**
 * A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
class LineDecoder {
    constructor() {
        _LineDecoder_buffer.set(this, void 0);
        _LineDecoder_carriageReturnIndex.set(this, void 0);
        __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array());
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null);
    }
    decode(chunk) {
        if (chunk == null) {
            return [];
        }
        const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk)
            : typeof chunk === 'string' ? encodeUTF8(chunk)
                : chunk;
        __classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]));
        const lines = [];
        let patternIndex;
        while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
            if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
                // skip until we either get a corresponding `\n`, a new `\r` or nothing
                __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index);
                continue;
            }
            // we got double \r or \rtext\n
            if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null &&
                (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
                lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
                __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")));
                __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null);
                continue;
            }
            const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
            const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
            lines.push(line);
            __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index));
            __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null);
        }
        return lines;
    }
    flush() {
        if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
            return [];
        }
        return this.decode('\n');
    }
}
_LineDecoder_buffer = new WeakMap(), _LineDecoder_carriageReturnIndex = new WeakMap();
// prettier-ignore
LineDecoder.NEWLINE_CHARS = new Set(['\n', '\r']);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
/**
 * This function searches the buffer for the end patterns, (\r or \n)
 * and returns an object with the index preceding the matched newline and the
 * index after the newline char. `null` is returned if no new line is found.
 *
 * ```ts
 * findNewLineIndex('abc\ndef') -> { preceding: 2, index: 3 }
 * ```
 */
function findNewlineIndex(buffer, startIndex) {
    const newline = 0x0a; // \n
    const carriage = 0x0d; // \r
    for (let i = startIndex ?? 0; i < buffer.length; i++) {
        if (buffer[i] === newline) {
            return { preceding: i, index: i + 1, carriage: false };
        }
        if (buffer[i] === carriage) {
            return { preceding: i, index: i + 1, carriage: true };
        }
    }
    return null;
}
function findDoubleNewlineIndex(buffer) {
    // This function searches the buffer for the end patterns (\r\r, \n\n, \r\n\r\n)
    // and returns the index right after the first occurrence of any pattern,
    // or -1 if none of the patterns are found.
    const newline = 0x0a; // \n
    const carriage = 0x0d; // \r
    for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === newline && buffer[i + 1] === newline) {
            // \n\n
            return i + 2;
        }
        if (buffer[i] === carriage && buffer[i + 1] === carriage) {
            // \r\r
            return i + 2;
        }
        if (buffer[i] === carriage &&
            buffer[i + 1] === newline &&
            i + 3 < buffer.length &&
            buffer[i + 2] === carriage &&
            buffer[i + 3] === newline) {
            // \r\n\r\n
            return i + 4;
        }
    }
    return -1;
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
const levelNumbers = {
    off: 0,
    error: 200,
    warn: 300,
    info: 400,
    debug: 500,
};
const parseLogLevel = (maybeLevel, sourceName, client) => {
    if (!maybeLevel) {
        return undefined;
    }
    if (hasOwn(levelNumbers, maybeLevel)) {
        return maybeLevel;
    }
    loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
    return undefined;
};
function noop() { }
function makeLogFn(fnLevel, logger, logLevel) {
    if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
        return noop;
    }
    else {
        // Don't wrap logger functions, we want the stacktrace intact!
        return logger[fnLevel].bind(logger);
    }
}
const noopLogger = {
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
};
let cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
    const logger = client.logger;
    const logLevel = client.logLevel ?? 'off';
    if (!logger) {
        return noopLogger;
    }
    const cachedLogger = cachedLoggers.get(logger);
    if (cachedLogger && cachedLogger[0] === logLevel) {
        return cachedLogger[1];
    }
    const levelLogger = {
        error: makeLogFn('error', logger, logLevel),
        warn: makeLogFn('warn', logger, logLevel),
        info: makeLogFn('info', logger, logLevel),
        debug: makeLogFn('debug', logger, logLevel),
    };
    cachedLoggers.set(logger, [logLevel, levelLogger]);
    return levelLogger;
}
const formatRequestDetails = (details) => {
    if (details.options) {
        details.options = { ...details.options };
        delete details.options['headers']; // redundant + leaks internals
    }
    if (details.headers) {
        details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
            name,
            (name.toLowerCase() === 'authorization' ||
                name.toLowerCase() === 'api-key' ||
                name.toLowerCase() === 'x-api-key' ||
                name.toLowerCase() === 'cookie' ||
                name.toLowerCase() === 'set-cookie') ?
                '***'
                : value,
        ]));
    }
    if ('retryOfRequestLogID' in details) {
        if (details.retryOfRequestLogID) {
            details.retryOf = details.retryOfRequestLogID;
        }
        delete details.retryOfRequestLogID;
    }
    return details;
};

var _Stream_client;
class Stream {
    constructor(iterator, controller, client) {
        this.iterator = iterator;
        _Stream_client.set(this, void 0);
        this.controller = controller;
        __classPrivateFieldSet(this, _Stream_client, client);
    }
    static fromSSEResponse(response, controller, client) {
        let consumed = false;
        const logger = client ? loggerFor(client) : console;
        async function* iterator() {
            if (consumed) {
                throw new GroqError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
            }
            consumed = true;
            let done = false;
            try {
                for await (const sse of _iterSSEMessages(response, controller)) {
                    if (done)
                        continue;
                    if (sse.data.startsWith('[DONE]')) {
                        done = true;
                        continue;
                    }
                    if (sse.event === null || !sse.event.startsWith('thread.')) {
                        let data;
                        try {
                            data = JSON.parse(sse.data);
                        }
                        catch (e) {
                            logger.error(`Could not parse message into JSON:`, sse.data);
                            logger.error(`From chunk:`, sse.raw);
                            throw e;
                        }
                        if (data && data.error) {
                            throw new APIError(undefined, data.error, undefined, response.headers);
                        }
                        yield data;
                    }
                    else {
                        let data;
                        try {
                            data = JSON.parse(sse.data);
                        }
                        catch (e) {
                            console.error(`Could not parse message into JSON:`, sse.data);
                            console.error(`From chunk:`, sse.raw);
                            throw e;
                        }
                        // TODO: Is this where the error should be thrown?
                        if (sse.event == 'error') {
                            throw new APIError(undefined, data.error, data.message, undefined);
                        }
                        yield { event: sse.event, data: data };
                    }
                }
                done = true;
            }
            catch (e) {
                // If the user calls `stream.controller.abort()`, we should exit without throwing.
                if (isAbortError(e))
                    return;
                throw e;
            }
            finally {
                // If the user `break`s, abort the ongoing request.
                if (!done)
                    controller.abort();
            }
        }
        return new Stream(iterator, controller, client);
    }
    /**
     * Generates a Stream from a newline-separated ReadableStream
     * where each item is a JSON value.
     */
    static fromReadableStream(readableStream, controller, client) {
        let consumed = false;
        async function* iterLines() {
            const lineDecoder = new LineDecoder();
            const iter = ReadableStreamToAsyncIterable(readableStream);
            for await (const chunk of iter) {
                for (const line of lineDecoder.decode(chunk)) {
                    yield line;
                }
            }
            for (const line of lineDecoder.flush()) {
                yield line;
            }
        }
        async function* iterator() {
            if (consumed) {
                throw new GroqError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
            }
            consumed = true;
            let done = false;
            try {
                for await (const line of iterLines()) {
                    if (done)
                        continue;
                    if (line)
                        yield JSON.parse(line);
                }
                done = true;
            }
            catch (e) {
                // If the user calls `stream.controller.abort()`, we should exit without throwing.
                if (isAbortError(e))
                    return;
                throw e;
            }
            finally {
                // If the user `break`s, abort the ongoing request.
                if (!done)
                    controller.abort();
            }
        }
        return new Stream(iterator, controller, client);
    }
    [(_Stream_client = new WeakMap(), Symbol.asyncIterator)]() {
        return this.iterator();
    }
    /**
     * Splits the stream into two streams which can be
     * independently read from at different speeds.
     */
    tee() {
        const left = [];
        const right = [];
        const iterator = this.iterator();
        const teeIterator = (queue) => {
            return {
                next: () => {
                    if (queue.length === 0) {
                        const result = iterator.next();
                        left.push(result);
                        right.push(result);
                    }
                    return queue.shift();
                },
            };
        };
        return [
            new Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
            new Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
        ];
    }
    /**
     * Converts this stream to a newline-separated ReadableStream of
     * JSON stringified values in the stream
     * which can be turned back into a Stream with `Stream.fromReadableStream()`.
     */
    toReadableStream() {
        const self = this;
        let iter;
        return makeReadableStream({
            async start() {
                iter = self[Symbol.asyncIterator]();
            },
            async pull(ctrl) {
                try {
                    const { value, done } = await iter.next();
                    if (done)
                        return ctrl.close();
                    const bytes = encodeUTF8(JSON.stringify(value) + '\n');
                    ctrl.enqueue(bytes);
                }
                catch (err) {
                    ctrl.error(err);
                }
            },
            async cancel() {
                await iter.return?.();
            },
        });
    }
}
async function* _iterSSEMessages(response, controller) {
    if (!response.body) {
        controller.abort();
        if (typeof globalThis.navigator !== 'undefined' &&
            globalThis.navigator.product === 'ReactNative') {
            throw new GroqError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
        }
        throw new GroqError(`Attempted to iterate over a response with no body`);
    }
    const sseDecoder = new SSEDecoder();
    const lineDecoder = new LineDecoder();
    const iter = ReadableStreamToAsyncIterable(response.body);
    for await (const sseChunk of iterSSEChunks(iter)) {
        for (const line of lineDecoder.decode(sseChunk)) {
            const sse = sseDecoder.decode(line);
            if (sse)
                yield sse;
        }
    }
    for (const line of lineDecoder.flush()) {
        const sse = sseDecoder.decode(line);
        if (sse)
            yield sse;
    }
}
/**
 * Given an async iterable iterator, iterates over it and yields full
 * SSE chunks, i.e. yields when a double new-line is encountered.
 */
async function* iterSSEChunks(iterator) {
    let data = new Uint8Array();
    for await (const chunk of iterator) {
        if (chunk == null) {
            continue;
        }
        const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk)
            : typeof chunk === 'string' ? encodeUTF8(chunk)
                : chunk;
        let newData = new Uint8Array(data.length + binaryChunk.length);
        newData.set(data);
        newData.set(binaryChunk, data.length);
        data = newData;
        let patternIndex;
        while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
            yield data.slice(0, patternIndex);
            data = data.slice(patternIndex);
        }
    }
    if (data.length > 0) {
        yield data;
    }
}
class SSEDecoder {
    constructor() {
        this.event = null;
        this.data = [];
        this.chunks = [];
    }
    decode(line) {
        if (line.endsWith('\r')) {
            line = line.substring(0, line.length - 1);
        }
        if (!line) {
            // empty line and we didn't previously encounter any messages
            if (!this.event && !this.data.length)
                return null;
            const sse = {
                event: this.event,
                data: this.data.join('\n'),
                raw: this.chunks,
            };
            this.event = null;
            this.data = [];
            this.chunks = [];
            return sse;
        }
        this.chunks.push(line);
        if (line.startsWith(':')) {
            return null;
        }
        let [fieldname, _, value] = partition(line, ':');
        if (value.startsWith(' ')) {
            value = value.substring(1);
        }
        if (fieldname === 'event') {
            this.event = value;
        }
        else if (fieldname === 'data') {
            this.data.push(value);
        }
        return null;
    }
}
function partition(str, delimiter) {
    const index = str.indexOf(delimiter);
    if (index !== -1) {
        return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
    }
    return [str, '', ''];
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
async function defaultParseResponse(client, props) {
    const { response, requestLogID, retryOfRequestLogID, startTime } = props;
    const body = await (async () => {
        // fetch refuses to read the body when the status code is 204.
        if (response.status === 204) {
            return null;
        }
        if (props.options.__binaryResponse) {
            return response;
        }
        if (props.options.stream) {
            return Stream.fromSSEResponse(response, props.controller, client);
        }
        const contentType = response.headers.get('content-type');
        const mediaType = contentType?.split(';')[0]?.trim();
        const isJSON = mediaType?.includes('application/json') || mediaType?.endsWith('+json');
        if (isJSON) {
            const contentLength = response.headers.get('content-length');
            if (contentLength === '0') {
                // if there is no content we can't do anything
                return undefined;
            }
            const json = await response.json();
            return json;
        }
        const text = await response.text();
        return text;
    })();
    loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        body,
        durationMs: Date.now() - startTime,
    }));
    return body;
}

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _APIPromise_client;
/**
 * A subclass of `Promise` providing additional helper methods
 * for interacting with the SDK.
 */
class APIPromise extends Promise {
    constructor(client, responsePromise, parseResponse = defaultParseResponse) {
        super((resolve) => {
            // this is maybe a bit weird but this has to be a no-op to not implicitly
            // parse the response body; instead .then, .catch, .finally are overridden
            // to parse the response
            resolve(null);
        });
        this.responsePromise = responsePromise;
        this.parseResponse = parseResponse;
        _APIPromise_client.set(this, void 0);
        __classPrivateFieldSet(this, _APIPromise_client, client);
    }
    _thenUnwrap(transform) {
        return new APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => transform(await this.parseResponse(client, props), props));
    }
    /**
     * Gets the raw `Response` instance instead of parsing the response
     * data.
     *
     * If you want to parse the response body but still get the `Response`
     * instance, you can use {@link withResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    asResponse() {
        return this.responsePromise.then((p) => p.response);
    }
    /**
     * Gets the parsed response data and the raw `Response` instance.
     *
     * If you just want to get the raw `Response` instance without parsing it,
     * you can use {@link asResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    async withResponse() {
        const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
        return { data, response };
    }
    parse() {
        if (!this.parsedPromise) {
            this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
        }
        return this.parsedPromise;
    }
    then(onfulfilled, onrejected) {
        return this.parse().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.parse().catch(onrejected);
    }
    finally(onfinally) {
        return this.parse().finally(onfinally);
    }
}
_APIPromise_client = new WeakMap();

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * Read an environment variable.
 *
 * Trims beginning and trailing whitespace.
 *
 * Will return undefined if the environment variable doesn't exist or cannot be accessed.
 */
const readEnv = (env) => {
    if (typeof globalThis.process !== 'undefined') {
        return process.env?.[env]?.trim() || undefined;
    }
    if (typeof globalThis.Deno !== 'undefined') {
        return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
    }
    return undefined;
};

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _Groq_instances, _a, _Groq_encoder, _Groq_baseURLOverridden;
/**
 * API Client for interfacing with the Groq API.
 */
class Groq {
    /**
     * API Client for interfacing with the Groq API.
     *
     * @param {string | undefined} [opts.apiKey=process.env['GROQ_API_KEY'] ?? undefined]
     * @param {string} [opts.baseURL=process.env['GROQ_BASE_URL'] ?? https://api.groq.com] - Override the default base URL for the API.
     * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
     * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     */
    constructor({ baseURL = readEnv('GROQ_BASE_URL'), apiKey = readEnv('GROQ_API_KEY'), ...opts } = {}) {
        _Groq_instances.add(this);
        _Groq_encoder.set(this, void 0);
        this.completions = new Completions(this);
        this.chat = new Chat(this);
        this.embeddings = new Embeddings(this);
        this.audio = new Audio(this);
        this.models = new Models(this);
        this.batches = new Batches(this);
        this.files = new Files(this);
        if (apiKey === undefined) {
            throw new GroqError("The GROQ_API_KEY environment variable is missing or empty; either provide it, or instantiate the Groq client with an apiKey option, like new Groq({ apiKey: 'My API Key' }).");
        }
        const options = {
            apiKey,
            ...opts,
            baseURL: baseURL || `https://api.groq.com`,
        };
        if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) ;
        this.baseURL = options.baseURL;
        this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT /* 1 minute */;
        this.logger = options.logger ?? console;
        const defaultLogLevel = 'warn';
        // Set default logLevel early so that we can log a warning in parseLogLevel.
        this.logLevel = defaultLogLevel;
        this.logLevel =
            parseLogLevel(options.logLevel, 'ClientOptions.logLevel', this) ??
                parseLogLevel(readEnv('GROQ_LOG'), "process.env['GROQ_LOG']", this) ??
                defaultLogLevel;
        this.fetchOptions = options.fetchOptions;
        this.maxRetries = options.maxRetries ?? 2;
        this.fetch = options.fetch ?? getDefaultFetch();
        __classPrivateFieldSet(this, _Groq_encoder, FallbackEncoder);
        const customHeadersEnv = readEnv('GROQ_CUSTOM_HEADERS');
        if (customHeadersEnv) {
            const parsed = {};
            for (const line of customHeadersEnv.split('\n')) {
                const colon = line.indexOf(':');
                if (colon >= 0) {
                    parsed[line.substring(0, colon).trim()] = line.substring(colon + 1).trim();
                }
            }
            options.defaultHeaders = { ...parsed, ...options.defaultHeaders };
        }
        this._options = options;
        this.apiKey = apiKey;
    }
    /**
     * Create a new client instance re-using the same options given to the current client with optional overriding.
     */
    withOptions(options) {
        const client = new this.constructor({
            ...this._options,
            baseURL: this.baseURL,
            maxRetries: this.maxRetries,
            timeout: this.timeout,
            logger: this.logger,
            logLevel: this.logLevel,
            fetch: this.fetch,
            fetchOptions: this.fetchOptions,
            apiKey: this.apiKey,
            ...options,
        });
        return client;
    }
    defaultQuery() {
        return this._options.defaultQuery;
    }
    validateHeaders({ values, nulls }) {
        return;
    }
    async authHeaders(opts) {
        return buildHeaders([{ Authorization: `Bearer ${this.apiKey}` }]);
    }
    /**
     * Basic re-implementation of `qs.stringify` for primitive types.
     */
    stringifyQuery(query) {
        return stringifyQuery(query);
    }
    getUserAgent() {
        return `${this.constructor.name}/JS ${VERSION}`;
    }
    defaultIdempotencyKey() {
        return `stainless-node-retry-${uuid4()}`;
    }
    makeStatusError(status, error, message, headers) {
        return APIError.generate(status, error, message, headers);
    }
    buildURL(path, query, defaultBaseURL) {
        const baseURL = (!__classPrivateFieldGet(this, _Groq_instances, "m", _Groq_baseURLOverridden).call(this) && defaultBaseURL) || this.baseURL;
        const url = isAbsoluteURL(path) ?
            new URL(path)
            : new URL(baseURL + (baseURL.endsWith('/') && path.startsWith('/') ? path.slice(1) : path));
        const defaultQuery = this.defaultQuery();
        const pathQuery = Object.fromEntries(url.searchParams);
        if (!isEmptyObj(defaultQuery) || !isEmptyObj(pathQuery)) {
            query = { ...pathQuery, ...defaultQuery, ...query };
        }
        if (typeof query === 'object' && query && !Array.isArray(query)) {
            url.search = this.stringifyQuery(query);
        }
        return url.toString();
    }
    /**
     * Used as a callback for mutating the given `FinalRequestOptions` object.
     */
    async prepareOptions(options) { }
    /**
     * Used as a callback for mutating the given `RequestInit` object.
     *
     * This is useful for cases where you want to add certain headers based off of
     * the request properties, e.g. `method` or `url`.
     */
    async prepareRequest(request, { url, options }) { }
    get(path, opts) {
        return this.methodRequest('get', path, opts);
    }
    post(path, opts) {
        return this.methodRequest('post', path, opts);
    }
    patch(path, opts) {
        return this.methodRequest('patch', path, opts);
    }
    put(path, opts) {
        return this.methodRequest('put', path, opts);
    }
    delete(path, opts) {
        return this.methodRequest('delete', path, opts);
    }
    methodRequest(method, path, opts) {
        return this.request(Promise.resolve(opts).then((opts) => {
            return { method, path, ...opts };
        }));
    }
    request(options, remainingRetries = null) {
        return new APIPromise(this, this.makeRequest(options, remainingRetries, undefined));
    }
    async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
        const options = await optionsInput;
        const maxRetries = options.maxRetries ?? this.maxRetries;
        if (retriesRemaining == null) {
            retriesRemaining = maxRetries;
        }
        await this.prepareOptions(options);
        const { req, url, timeout } = await this.buildRequest(options, {
            retryCount: maxRetries - retriesRemaining,
        });
        await this.prepareRequest(req, { url, options });
        /** Not an API request ID, just for correlating local log entries. */
        const requestLogID = 'log_' + ((Math.random() * (1 << 24)) | 0).toString(16).padStart(6, '0');
        const retryLogStr = retryOfRequestLogID === undefined ? '' : `, retryOf: ${retryOfRequestLogID}`;
        const startTime = Date.now();
        loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
            retryOfRequestLogID,
            method: options.method,
            url,
            options,
            headers: req.headers,
        }));
        if (options.signal?.aborted) {
            throw new APIUserAbortError();
        }
        const controller = new AbortController();
        const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
        const headersTime = Date.now();
        if (response instanceof globalThis.Error) {
            const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
            if (options.signal?.aborted) {
                throw new APIUserAbortError();
            }
            // detect native connection timeout errors
            // deno throws "TypeError: error sending request for url (https://example/): client error (Connect): tcp connect error: Operation timed out (os error 60): Operation timed out (os error 60)"
            // undici throws "TypeError: fetch failed" with cause "ConnectTimeoutError: Connect Timeout Error (attempted address: example:443, timeout: 1ms)"
            // others do not provide enough information to distinguish timeouts from other connection errors
            const isTimeout = isAbortError(response) ||
                /timed? ?out/i.test(String(response) + ('cause' in response ? String(response.cause) : ''));
            if (retriesRemaining) {
                loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - ${retryMessage}`);
                loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (${retryMessage})`, formatRequestDetails({
                    retryOfRequestLogID,
                    url,
                    durationMs: headersTime - startTime,
                    message: response.message,
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
            }
            loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - error; no more retries left`);
            loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (error; no more retries left)`, formatRequestDetails({
                retryOfRequestLogID,
                url,
                durationMs: headersTime - startTime,
                message: response.message,
            }));
            if (isTimeout) {
                throw new APIConnectionTimeoutError();
            }
            throw new APIConnectionError({ cause: response });
        }
        const responseInfo = `[${requestLogID}${retryLogStr}] ${req.method} ${url} ${response.ok ? 'succeeded' : 'failed'} with status ${response.status} in ${headersTime - startTime}ms`;
        if (!response.ok) {
            const shouldRetry = await this.shouldRetry(response);
            if (retriesRemaining && shouldRetry) {
                const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
                // We don't need the body of this response.
                await CancelReadableStream(response.body);
                loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
                loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
                    retryOfRequestLogID,
                    url: response.url,
                    status: response.status,
                    headers: response.headers,
                    durationMs: headersTime - startTime,
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
            }
            const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
            loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
            const errText = await response.text().catch((err) => castToError(err).message);
            const errJSON = safeJSON(errText);
            const errMessage = errJSON ? undefined : errText;
            loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
                retryOfRequestLogID,
                url: response.url,
                status: response.status,
                headers: response.headers,
                message: errMessage,
                durationMs: Date.now() - startTime,
            }));
            const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
            throw err;
        }
        loggerFor(this).info(responseInfo);
        loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
            retryOfRequestLogID,
            url: response.url,
            status: response.status,
            headers: response.headers,
            durationMs: headersTime - startTime,
        }));
        return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
    }
    async fetchWithTimeout(url, init, ms, controller) {
        const { signal, method, ...options } = init || {};
        const abort = this._makeAbort(controller);
        if (signal)
            signal.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(abort, ms);
        const isReadableBody = (globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream) ||
            (typeof options.body === 'object' && options.body !== null && Symbol.asyncIterator in options.body);
        const fetchOptions = {
            signal: controller.signal,
            ...(isReadableBody ? { duplex: 'half' } : {}),
            method: 'GET',
            ...options,
        };
        if (method) {
            // Custom methods like 'patch' need to be uppercased
            // See https://github.com/nodejs/undici/issues/2294
            fetchOptions.method = method.toUpperCase();
        }
        try {
            // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
            return await this.fetch.call(undefined, url, fetchOptions);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async shouldRetry(response) {
        // Note this is not a standard header.
        const shouldRetryHeader = response.headers.get('x-should-retry');
        // If the server explicitly says whether or not to retry, obey.
        if (shouldRetryHeader === 'true')
            return true;
        if (shouldRetryHeader === 'false')
            return false;
        // Retry on request timeouts.
        if (response.status === 408)
            return true;
        // Retry on lock timeouts.
        if (response.status === 409)
            return true;
        // Retry on rate limits.
        if (response.status === 429)
            return true;
        // Retry internal errors.
        if (response.status >= 500)
            return true;
        return false;
    }
    async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
        let timeoutMillis;
        // Note the `retry-after-ms` header may not be standard, but is a good idea and we'd like proactive support for it.
        const retryAfterMillisHeader = responseHeaders?.get('retry-after-ms');
        if (retryAfterMillisHeader) {
            const timeoutMs = parseFloat(retryAfterMillisHeader);
            if (!Number.isNaN(timeoutMs)) {
                timeoutMillis = timeoutMs;
            }
        }
        // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
        const retryAfterHeader = responseHeaders?.get('retry-after');
        if (retryAfterHeader && !timeoutMillis) {
            const timeoutSeconds = parseFloat(retryAfterHeader);
            if (!Number.isNaN(timeoutSeconds)) {
                timeoutMillis = timeoutSeconds * 1000;
            }
            else {
                timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
            }
        }
        // If the API asks us to wait a certain amount of time, just do what it
        // says, but otherwise calculate a default
        if (timeoutMillis === undefined) {
            const maxRetries = options.maxRetries ?? this.maxRetries;
            timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
        }
        await sleep(timeoutMillis);
        return this.makeRequest(options, retriesRemaining - 1, requestLogID);
    }
    calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
        const initialRetryDelay = 0.5;
        const maxRetryDelay = 8.0;
        const numRetries = maxRetries - retriesRemaining;
        // Apply exponential backoff, but not more than the max.
        const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
        // Apply some jitter, take up to at most 25 percent of the retry time.
        const jitter = 1 - Math.random() * 0.25;
        return sleepSeconds * jitter * 1000;
    }
    async buildRequest(inputOptions, { retryCount = 0 } = {}) {
        const options = { ...inputOptions };
        const { method, path, query, defaultBaseURL } = options;
        const url = this.buildURL(path, query, defaultBaseURL);
        if ('timeout' in options)
            validatePositiveInteger('timeout', options.timeout);
        options.timeout = options.timeout ?? this.timeout;
        const { bodyHeaders, body } = this.buildBody({ options });
        const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
        const req = {
            method,
            headers: reqHeaders,
            ...(options.signal && { signal: options.signal }),
            ...(globalThis.ReadableStream &&
                body instanceof globalThis.ReadableStream && { duplex: 'half' }),
            ...(body && { body }),
            ...(this.fetchOptions ?? {}),
            ...(options.fetchOptions ?? {}),
        };
        return { req, url, timeout: options.timeout };
    }
    async buildHeaders({ options, method, bodyHeaders, retryCount, }) {
        let idempotencyHeaders = {};
        if (this.idempotencyHeader && method !== 'get') {
            if (!options.idempotencyKey)
                options.idempotencyKey = this.defaultIdempotencyKey();
            idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
        }
        const headers = buildHeaders([
            idempotencyHeaders,
            {
                Accept: 'application/json',
                'User-Agent': this.getUserAgent(),
                'X-Stainless-Retry-Count': String(retryCount),
                ...(options.timeout ? { 'X-Stainless-Timeout': String(Math.trunc(options.timeout / 1000)) } : {}),
                ...getPlatformHeaders(),
            },
            await this.authHeaders(options),
            this._options.defaultHeaders,
            bodyHeaders,
            options.headers,
        ]);
        this.validateHeaders(headers);
        return headers.values;
    }
    _makeAbort(controller) {
        // note: we can't just inline this method inside `fetchWithTimeout()` because then the closure
        //       would capture all request options, and cause a memory leak.
        return () => controller.abort();
    }
    buildBody({ options: { body, headers: rawHeaders } }) {
        if (!body) {
            return { bodyHeaders: undefined, body: undefined };
        }
        const headers = buildHeaders([rawHeaders]);
        if (
        // Pass raw type verbatim
        ArrayBuffer.isView(body) ||
            body instanceof ArrayBuffer ||
            body instanceof DataView ||
            (typeof body === 'string' &&
                // Preserve legacy string encoding behavior for now
                headers.values.has('content-type')) ||
            // `Blob` is superset of `File`
            (globalThis.Blob && body instanceof globalThis.Blob) ||
            // `FormData` -> `multipart/form-data`
            body instanceof FormData ||
            // `URLSearchParams` -> `application/x-www-form-urlencoded`
            body instanceof URLSearchParams ||
            // Send chunked stream (each chunk has own `length`)
            (globalThis.ReadableStream && body instanceof globalThis.ReadableStream)) {
            return { bodyHeaders: undefined, body: body };
        }
        else if (typeof body === 'object' &&
            (Symbol.asyncIterator in body ||
                (Symbol.iterator in body && 'next' in body && typeof body.next === 'function'))) {
            return { bodyHeaders: undefined, body: ReadableStreamFrom(body) };
        }
        else if (typeof body === 'object' &&
            headers.values.get('content-type') === 'application/x-www-form-urlencoded') {
            return {
                bodyHeaders: { 'content-type': 'application/x-www-form-urlencoded' },
                body: this.stringifyQuery(body),
            };
        }
        else {
            return __classPrivateFieldGet(this, _Groq_encoder, "f").call(this, { body, headers });
        }
    }
}
_a = Groq, _Groq_encoder = new WeakMap(), _Groq_instances = new WeakSet(), _Groq_baseURLOverridden = function _Groq_baseURLOverridden() {
    return this.baseURL !== 'https://api.groq.com';
};
Groq.Groq = _a;
Groq.DEFAULT_TIMEOUT = 60000; // 1 minute
Groq.GroqError = GroqError;
Groq.APIError = APIError;
Groq.APIConnectionError = APIConnectionError;
Groq.APIConnectionTimeoutError = APIConnectionTimeoutError;
Groq.APIUserAbortError = APIUserAbortError;
Groq.NotFoundError = NotFoundError;
Groq.ConflictError = ConflictError;
Groq.RateLimitError = RateLimitError;
Groq.BadRequestError = BadRequestError;
Groq.AuthenticationError = AuthenticationError;
Groq.InternalServerError = InternalServerError;
Groq.PermissionDeniedError = PermissionDeniedError;
Groq.UnprocessableEntityError = UnprocessableEntityError;
Groq.toFile = toFile;
Groq.Completions = Completions;
Groq.Chat = Chat;
Groq.Embeddings = Embeddings;
Groq.Audio = Audio;
Groq.Models = Models;
Groq.Batches = Batches;
Groq.Files = Files;

// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

const index = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  APIConnectionError: APIConnectionError,
  APIConnectionTimeoutError: APIConnectionTimeoutError,
  APIError: APIError,
  APIPromise: APIPromise,
  APIUserAbortError: APIUserAbortError,
  AuthenticationError: AuthenticationError,
  BadRequestError: BadRequestError,
  ConflictError: ConflictError,
  Groq: Groq,
  GroqError: GroqError,
  InternalServerError: InternalServerError,
  NotFoundError: NotFoundError,
  PermissionDeniedError: PermissionDeniedError,
  RateLimitError: RateLimitError,
  UnprocessableEntityError: UnprocessableEntityError,
  default: Groq,
  toFile: toFile
}, Symbol.toStringTag, { value: 'Module' }));

const groq$4 = new Groq({ apiKey: process.env.GROQ_API_KEY });
async function generateConversationalReply(userPrompt, history = []) {
  var _a, _b, _c;
  const systemInstruction = `
    You are FlowVision Intelligence, a friendly and professional AI assistant embedded in a
    municipal document tracking and workflow platform.

    Personality & rules:
    - Be warm, concise, and helpful. Use natural language, not robotic templates.
    - You help users track, search, and report on documents, offices, and workflow stages.
    - When a user greets you or makes small talk, respond conversationally and briefly
      mention how you can help (e.g. "I can pull up documents, summarize records, or build reports").
    - If they ask about a previous answer, use the conversation history to clarify.
    - NEVER invent specific document data, record IDs, counts, or statuses. If they want real
      records, invite them to ask for what to fetch or filter \u2014 the data engine will handle it.
    - Keep replies to a few short sentences unless the user asks for detail.
  `;
  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-5).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userPrompt }
  ];
  try {
    const completion = await groq$4.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.4
    });
    return ((_c = (_b = (_a = completion.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) == null ? void 0 : _c.trim()) || "I'm here to help. You can ask me to fetch, filter, or summarize your documents and records.";
  } catch (error) {
    console.error("[Conversation] reply generation failed:", error);
    return "I'm here to help. You can ask me to fetch, filter, or summarize your documents and records anytime.";
  }
}

const ISSUE_ALLOWED_ROLES = ["client", "employee"];
function issueRealtimeChannel(orgId, issueId) {
  return `org:${orgId}:issue:${issueId}`;
}
function orgLogisticsChannel(orgId) {
  return `org:${orgId}:logistics`;
}
async function assertDocumentOrgAccess(event, supabase, documentId) {
  const actor = await resolveActorContext(event, supabase);
  const { data: document, error } = await supabase.from("documents").select("id, org_id, title, tracking_status, origin_office_id, current_office_id").eq("id", documentId).maybeSingle();
  if (error) {
    throw createError$1({ statusCode: 500, message: error.message });
  }
  if (!document) {
    throw createError$1({ statusCode: 404, message: "Document not found." });
  }
  if (String(document.org_id) !== actor.orgId) {
    throw createError$1({
      statusCode: 403,
      message: "CROSS_ORG_VIOLATION: Document belongs to a different organisation. Access denied."
    });
  }
  return { actor, document };
}
async function assertIssueOrgAccess(event, supabase, issueId) {
  const actor = await resolveActorContext(event, supabase);
  const { data: issue, error } = await supabase.from("document_issues").select("id, document_id, org_id, reported_by_office_id, title, status, created_at").eq("id", issueId).maybeSingle();
  if (error) {
    throw createError$1({ statusCode: 500, message: error.message });
  }
  if (!issue) {
    throw createError$1({ statusCode: 404, message: "Issue thread not found." });
  }
  if (String(issue.org_id) !== actor.orgId) {
    throw createError$1({
      statusCode: 403,
      message: "CROSS_ORG_VIOLATION: Issue thread belongs to a different organisation. Access denied."
    });
  }
  return { actor, issue };
}
async function assertReportingOfficeAccess(supabase, actor, officeId) {
  var _a;
  const { data: office, error } = await supabase.from("offices").select("id, name, code, org_id, assigned_user").eq("id", officeId).maybeSingle();
  if (error) {
    throw createError$1({ statusCode: 500, message: error.message });
  }
  if (!office) {
    throw createError$1({ statusCode: 404, message: "Reporting office not found." });
  }
  if (String(office.org_id) !== actor.orgId) {
    throw createError$1({
      statusCode: 403,
      message: "CROSS_ORG_VIOLATION: Reporting office belongs to a different organisation."
    });
  }
  if (actor.userRole === "employee" && String(office.assigned_user) !== actor.userId) {
    throw createError$1({
      statusCode: 403,
      message: "UNAUTHORIZED_OFFICE: Employees may only flag issues from their assigned sub-offices."
    });
  }
  return { id: String(office.id), name: office.name, code: (_a = office.code) != null ? _a : null };
}
async function broadcastIssueRealtime(_event, orgId, issueId, broadcastEvent, payload) {
  const client = useServerSupabase();
  const channels = [
    issueRealtimeChannel(orgId, issueId),
    orgLogisticsChannel(orgId)
  ];
  try {
    await Promise.all(
      channels.map(
        (channelName) => client.broadcast(channelName, broadcastEvent, payload)
      )
    );
  } catch (err) {
    console.warn("[documentIssues] Realtime broadcast failed:", err);
  }
}

const groq$3 = new Groq({ apiKey: process.env.GROQ_API_KEY });
const HTML_BODY_RULES = `
    - Use semantic HTML only: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>, <thead>,
      <tbody>, <tr>, <th>, <td>. NEVER include <script>, <style>, inline style attributes,
      event handlers, or <html>/<body> wrappers.
    - Keep it concise, professional, and well-organized.
`;
const SPREADSHEET_MATRIX_WRAPPER = "fv-spreadsheet-matrix";
const SPREADSHEET_FORMAT_PATTERN = /\b(spreadsheet|excel|xlsx|csv|grid|matrix|table\s+layout|raw\s+columns?|tabular|data\s+grid|column\s+view)\b/i;
function wantsSpreadsheetFormat(prompt) {
  return SPREADSHEET_FORMAT_PATTERN.test(prompt);
}
const SPREADSHEET_TABLE_SPEC = `
    SPREADSHEET / EXCEL MODE \u2014 structural rules:
    - STRIP all narrative elements: NO <h2>, <h3>, <p> executive summaries, NO signature blocks.
    - Output ONLY a wrapper <div class="${SPREADSHEET_MATRIX_WRAPPER}"> containing ONE <table>.
    - Apply these EXACT Tailwind classes:
      \u2022 <table class="w-full border-collapse text-sm">
      \u2022 <thead> with <tr> containing <th class="border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
      \u2022 <tbody> rows: <tr class="odd:bg-white even:bg-slate-50 hover:bg-orange-50/40 transition-colors">
      \u2022 <td class="border border-slate-200 px-4 py-2.5 text-slate-700 align-top">
    - Preserve EVERY data cell from the source document; do not drop rows or columns unless asked.
    - Title should reflect spreadsheet context (append " \u2014 SPREADSHEET" if helpful).
`;
const SENSITIVE_KEYS = /* @__PURE__ */ new Set([
  "id",
  "org_id",
  "user_id",
  "mysql_storage_id",
  "file_blob",
  "actualFileTextContent"
]);
const escapeHtml = (value) => String(value != null ? value : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const prettifyKey = (key) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const shorten = (value, max = 160) => {
  const text = value === null || value === void 0 || value === "" ? "\u2014" : String(value);
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
};
const stripUnsafe = (html) => html.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "").replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "").replace(/\son\w+\s*=\s*"[^"]*"/gi, "").replace(/\son\w+\s*=\s*'[^']*'/gi, "").replace(/javascript:/gi, "");
const buildFallbackDocument = (userPrompt, rows, blueprint) => {
  var _a;
  const rawTitle = ((_a = blueprint == null ? void 0 : blueprint.documentMetadata) == null ? void 0 : _a.title) || `Report \u2014 ${userPrompt}` || "Document Report";
  const title = String(rawTitle).toUpperCase().slice(0, 120);
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      title,
      htmlContent: "<h2>Executive Summary</h2><p>No records matched this request for your organization.</p>"
    };
  }
  const keys = Object.keys(rows[0]).filter((k) => !SENSITIVE_KEYS.has(k));
  const headCells = keys.map((k) => `<th>${escapeHtml(prettifyKey(k))}</th>`).join("");
  const bodyRows = rows.map(
    (row) => `<tr>${keys.map((k) => `<td>${escapeHtml(shorten(row[k]))}</td>`).join("")}</tr>`
  ).join("");
  const htmlContent = `
    <h2>Executive Summary</h2>
    <p>This report compiles <strong>${rows.length}</strong> record(s) retrieved from your
    organization's documents in response to: &ldquo;${escapeHtml(userPrompt)}&rdquo;.</p>
    <h3>Record Detail</h3>
    <table>
      <thead><tr>${headCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
  return { title, htmlContent };
};
const stripHtmlTags = (fragment) => fragment.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const extractTableDataFromHtml = (html) => {
  const headers = [];
  const rows = [];
  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    for (const m of theadMatch[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)) {
      headers.push(stripHtmlTags(m[1]));
    }
  }
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (tbodyMatch) {
    for (const tr of tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (m) => stripHtmlTags(m[1])
      );
      if (cells.length) rows.push(cells);
    }
  }
  if (!headers.length && rows.length) {
    return {
      headers: rows[0].map((_, i) => `Column ${i + 1}`),
      rows: rows.slice(1).length ? rows.slice(1) : rows
    };
  }
  return { headers, rows };
};
const buildSpreadsheetMatrixHtml = (headers, rows) => {
  const thCells = headers.map(
    (h) => `<th class="border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">${escapeHtml(
      h
    )}</th>`
  ).join("");
  const bodyRows = rows.map((row) => {
    const tds = row.map(
      (cell) => `<td class="border border-slate-200 px-4 py-2.5 text-slate-700 align-top">${escapeHtml(
        cell
      )}</td>`
    ).join("");
    return `<tr class="odd:bg-white even:bg-slate-50 hover:bg-orange-50/40 transition-colors">${tds}</tr>`;
  }).join("");
  return `<div class="${SPREADSHEET_MATRIX_WRAPPER}"><table class="w-full border-collapse text-sm"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
};
const buildSpreadsheetFallback = (existing) => {
  const { headers, rows } = extractTableDataFromHtml(existing.htmlContent);
  if (!headers.length && !rows.length) {
    return existing;
  }
  const title = existing.title.toUpperCase().includes("SPREADSHEET") ? existing.title : `${existing.title} \u2014 SPREADSHEET`.toUpperCase().slice(0, 120);
  return {
    title,
    htmlContent: buildSpreadsheetMatrixHtml(headers, rows)
  };
};
async function reviseToSpreadsheetMatrix(existing, critique, history = []) {
  var _a, _b;
  if (!(existing == null ? void 0 : existing.htmlContent)) {
    return existing;
  }
  const systemInstruction = `
    You are the FlowVision Spreadsheet Matrix Converter. The user wants to SWITCH the
    existing document from a narrative report layout into a pure administrative DATA GRID.

    Respond with ONLY a raw JSON object (no markdown fences):
    {
      "title": "A CLEAN, DESCRIPTIVE, UPPERCASE TITLE (include SPREADSHEET if appropriate)",
      "htmlContent": "full-bleed matrix HTML"
    }

    ${SPREADSHEET_TABLE_SPEC}
  `;
  try {
    const completion = await groq$3.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        {
          role: "user",
          content: `Existing document title: "${existing.title}"

Existing document htmlContent:
${existing.htmlContent}

Format-switch request: "${critique}"`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    const parsed = JSON.parse(((_b = (_a = completion.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) || "{}");
    const title = String((parsed == null ? void 0 : parsed.title) || `${existing.title} \u2014 SPREADSHEET`).toUpperCase().slice(0, 120);
    let htmlContent = stripUnsafe(String((parsed == null ? void 0 : parsed.htmlContent) || "")).trim();
    if (!htmlContent.includes(SPREADSHEET_MATRIX_WRAPPER)) {
      htmlContent = `<div class="${SPREADSHEET_MATRIX_WRAPPER}">${htmlContent}</div>`;
    }
    if (!htmlContent.includes("<table")) {
      return buildSpreadsheetFallback(existing);
    }
    return { title, htmlContent };
  } catch (error) {
    console.error("[documentSynthesizer] spreadsheet conversion failed, using fallback:", error);
    return buildSpreadsheetFallback(existing);
  }
}
async function synthesizeDocumentPayload(userPrompt, rows, blueprint) {
  var _a, _b, _c;
  if (!Array.isArray(rows) || rows.length === 0) {
    return buildFallbackDocument(userPrompt, rows, blueprint);
  }
  if (wantsSpreadsheetFormat(userPrompt)) {
    const keys = Object.keys(rows[0]).filter((k) => !SENSITIVE_KEYS.has(k));
    const headers = keys.map(prettifyKey);
    const tableRows = rows.map((row) => keys.map((k) => shorten(row[k])));
    const rawTitle = ((_a = blueprint == null ? void 0 : blueprint.documentMetadata) == null ? void 0 : _a.title) || `Report \u2014 ${userPrompt}` || "Document Report";
    const title = `${String(rawTitle)} \u2014 SPREADSHEET`.toUpperCase().slice(0, 120);
    return { title, htmlContent: buildSpreadsheetMatrixHtml(headers, tableRows) };
  }
  const systemInstruction = `
    You are the FlowVision Document Synthesizer. You transform raw database rows into a
    clean, formal, executive-ready DOCUMENT \u2014 never a bare spreadsheet dump.

    Respond with ONLY a raw JSON object (no markdown fences) in this EXACT shape:
    {
      "title": "A CLEAN, DESCRIPTIVE, UPPERCASE TITLE",
      "htmlContent": "semantic HTML body"
    }

    Rules for "htmlContent":
    - Use semantic HTML only: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>, <thead>,
      <tbody>, <tr>, <th>, <td>. NEVER include <script>, <style>, inline style attributes,
      event handlers, or <html>/<body> wrappers.
    - Begin with an "<h2>Executive Summary</h2>" and a concise paragraph describing what the
      data shows (counts, notable statuses, time range).
    - Add logical sections with headers, and present the records in a well-organized <table>
      with clear column headers.
    - Be faithful to the data \u2014 do not invent records, counts, IDs, or statuses that are not
      present in the provided rows.
    - Keep it concise and professional.
  `;
  const safeRows = rows.map((row) => {
    const clone = {};
    for (const [key, value] of Object.entries(row)) {
      if (!SENSITIVE_KEYS.has(key)) clone[key] = value;
    }
    return clone;
  });
  try {
    const completion = await groq$3.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `User Request: "${userPrompt}"

Layout Blueprint: ${JSON.stringify(blueprint != null ? blueprint : {}, null, 2)}

Database Rows: ${JSON.stringify(safeRows, null, 2)}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    const parsed = JSON.parse(((_c = (_b = completion.choices[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "{}");
    const title = String((parsed == null ? void 0 : parsed.title) || "DOCUMENT REPORT").toUpperCase().slice(0, 120);
    const htmlContent = stripUnsafe(String((parsed == null ? void 0 : parsed.htmlContent) || "")).trim();
    if (!htmlContent) {
      return buildFallbackDocument(userPrompt, rows, blueprint);
    }
    return { title, htmlContent };
  } catch (error) {
    console.error("[documentSynthesizer] synthesis failed, using fallback:", error);
    return buildFallbackDocument(userPrompt, rows, blueprint);
  }
}
async function reviseDocumentPayload(existing, critique, history = []) {
  var _a, _b;
  if (!(existing == null ? void 0 : existing.htmlContent)) {
    return existing;
  }
  if (wantsSpreadsheetFormat(critique)) {
    return reviseToSpreadsheetMatrix(existing, critique, history);
  }
  const systemInstruction = `
    You are the FlowVision Document Reviser. You are given an EXISTING document (title +
    semantic HTML body) and a user's formatting/layout critique. Apply ONLY the requested
    layout/formatting changes and return the full, updated document.

    Respond with ONLY a raw JSON object (no markdown fences) in this EXACT shape:
    {
      "title": "A CLEAN, DESCRIPTIVE, UPPERCASE TITLE",
      "htmlContent": "the FULL updated semantic HTML body"
    }

    Revision rules:
    - PRESERVE all existing record data and facts. Do not invent, drop, or alter values
      unless the critique explicitly asks to add/remove a column, row, or section.
    - Apply the critique faithfully (e.g. tone/formality, add a signature block, remove a
      column, restructure into sections, rename the title, shorten).
    - Return the ENTIRE document, not just the changed fragment.
    ${HTML_BODY_RULES}
  `;
  try {
    const completion = await groq$3.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        {
          role: "user",
          content: `Existing document title: "${existing.title}"

Existing document htmlContent:
${existing.htmlContent}

Formatting critique to apply: "${critique}"`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    const parsed = JSON.parse(((_b = (_a = completion.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) || "{}");
    const title = String((parsed == null ? void 0 : parsed.title) || existing.title || "DOCUMENT REPORT").toUpperCase().slice(0, 120);
    const htmlContent = stripUnsafe(String((parsed == null ? void 0 : parsed.htmlContent) || "")).trim();
    if (!htmlContent) {
      return existing;
    }
    return { title, htmlContent };
  } catch (error) {
    console.error("[documentSynthesizer] revision failed, keeping existing payload:", error);
    return existing;
  }
}

const groq$2 = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
async function generateDocumentTemplate(userPrompt, dbRows) {
  var _a, _b;
  const systemInstruction = `
    You are the Gen AI JSON Template Formatter for FlowVision.
    Your role is to act as a layout architect (Synthetic Intelligence). You sit between the raw database results and the final file generator.
    
    Your task is to analyze the user's original request alongside the raw database rows, and output a highly structured JSON layout blueprint.

    CRITICAL STRATEGY RULES:
    1. Visualize the User's Need Output: Decide whether this data belongs in a Grid/Table layout (Excel) or an Administrative Text/Narrative layout (Word).
    2. Data Must Be Concise: Provide clear rules for handling long descriptions, grouping related records, or highlighting important states (e.g., status = 'Approved').
    3. File Format Identification: Detect if the user needs an EXCEL (.xlsx) or WORD (.docx) style structure based on context. If it looks mathematical or heavy on rows, default to EXCEL.

    CRITICAL FORMATTING RULE:
    - Respond ONLY with a valid, raw JSON object matching the target schema.
    - Do not wrap the JSON in markdown code blocks like \`\`\`json.

    Target Output JSON Schema:
    {
      "targetFileFormat": "EXCEL | WORD",
      "documentMetadata": {
        "title": "A highly professional, context-aware title for the document",
        "brandingContext": "The organization or general context inferred from the request, or 'General System' if none is available",
        "generationDate": "2026-05-27"
      },
      "visualLayoutSpecification": {
        "structureType": "TABULAR_GRID | NARRATIVE_REPORT",
        "theme": "A short style guide instruction (e.g., 'Clean corporate blue, alternating row colors')",
        "sections": [
          {
            "sectionId": "string_identifier",
            "type": "title_card | metrics_row | grid | text_block",
            "contentInstructions": "Detailed explicit instruction for the AI Data Builder on what elements to place here."
          }
        ]
      },
      "dataBuilderDirectives": {
        "concisenessStrategy": "Instructions on how to keep the rows compact (e.g., truncate text, group by years)",
        "aggregationRules": {
          "calculateTotals": true,
          "targetCalculations": "Description of what rows or columns to count/aggregate (e.g., 'Total count of approved records')"
        }
      }
    }
  `;
  const databaseContextString = JSON.stringify(dbRows, null, 2);
  try {
    const chatCompletion = await groq$2.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `User Request: "${userPrompt}"

Fetched Database Rows:
${databaseContextString}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    const rawResponse = ((_b = (_a = chatCompletion.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) || "{}";
    return JSON.parse(rawResponse);
  } catch (error) {
    throw createError$1({
      statusCode: 500,
      statusMessage: `Template Formatting Failed: ${error.message}`
    });
  }
}

const groq$1 = new Groq({ apiKey: process.env.GROQ_API_KEY });
async function classifyIntent(userPrompt, history = [], hasActiveDocument = false) {
  var _a, _b;
  const systemInstruction = `
    You are the Intent Router for FlowVision, a municipal document tracking platform.
    Classify the user's LATEST message into exactly one intent.

    Return ONLY raw JSON (no markdown fences):
    { "intent": "conversation" | "data_query" | "document_revision" }

    Context: an active generated document ${hasActiveDocument ? "EXISTS" : "does NOT exist"} in this conversation.

    Rules:
    - "data_query": the user explicitly wants to FETCH, FILTER, VIEW, LIST, SEARCH,
      SUMMARIZE, COUNT, or MANAGE specific documents, records, reports, offices, stages,
      or municipal data for the FIRST time, or asks for a NEW/DIFFERENT dataset
      (e.g. "show approved subsidy documents from 2024", "now list pending finance records").
    - "document_revision": ONLY valid when an active document EXISTS. The user is asking to
      EDIT, REFORMAT, RESTYLE, or ADJUST THE LAYOUT of the document already produced \u2014 without
      changing which records it is about (e.g. "make the layout more formal",
      "add a signature block to the bottom", "remove the description column",
      "turn this into a spreadsheet", "show as excel", "convert to grid layout",
      "raw columns view", "change the title", "make it shorter").
      If no active document exists, NEVER choose this.
    - "conversation": greetings, small talk, thanks, capability/identity questions,
      clarifications, or meta questions about a previous answer
      (e.g. "hi", "hello", "how are you", "what can you do", "explain the previous answer").
      When in doubt, choose "conversation".
  `;
  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userPrompt }
  ];
  try {
    const completion = await groq$1.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0
    });
    const raw = ((_b = (_a = completion.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) || "{}";
    const parsed = JSON.parse(raw);
    const intent = parsed == null ? void 0 : parsed.intent;
    if (intent === "document_revision") {
      return hasActiveDocument ? "document_revision" : "conversation";
    }
    if (intent === "data_query") {
      return "data_query";
    }
    return "conversation";
  } catch (error) {
    console.error("[IntentRouter] classification failed, defaulting to conversation:", error);
    return "conversation";
  }
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
async function translateTextToQuery(userPrompt) {
  var _a, _b;
  const systemInstruction = `
    You are the TTQT (Text-to-Query Translation) engine for FlowVision. 
    Your sole task is to analyze a natural language request for document generation and translate it into structural database query conditions.

    Analyze the user prompt to extract:
    1. The type of document/report they want to generate (e.g., payroll, performance, tracking logs).
    2. The time frame (start date, end date, or specific years).
    3. Any special sorting or aggregation requests.

    CRITICAL RULE: 
    - You must respond ONLY with a raw JSON object. 
    - Do not wrap it in markdown block fences like \`\`\`json.

    Target Output JSON Schema:
    {
      "documentType": "The targeted report category (e.g., 'payroll')",
      "queryFilters": {
        "years": ["Array of years extracted, e.g., 2020, 2021"],
        "additionalConditions": "Any extra criteria like 'Approved status only' or 'overtime data included'"
      },
      "simulatedQuerySpec": {
        "description": "Human readable technical explanation of what data to pull.",
        "targetFields": ["list", "of", "fields", "needed", "for", "this", "report"],
        "mockSqlWhereClause": "A mock SQL WHERE statement representing these conditions for testing."
      }
    }
  `;
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0
      // Set to 0 for absolute precision and stability
    });
    const rawResponse = ((_b = (_a = chatCompletion.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) || "{}";
    return JSON.parse(rawResponse);
  } catch (error) {
    throw createError$1({
      statusCode: 500,
      statusMessage: `TTQT Extraction Failed: ${error.message}`
    });
  }
}

const collections = {
};

const DEFAULT_ENDPOINT = "https://api.iconify.design";
const _jv1OlN = defineCachedEventHandler(async (event) => {
  const options = useAppConfig().icon;
  const collectionName = event.context.params?.collection?.replace(/\.json$/, "");
  const collection = collectionName && Object.hasOwn(collections, collectionName) ? await collections[collectionName]?.() : null;
  const apiEndPoint = options.iconifyApiEndpoint || DEFAULT_ENDPOINT;
  const icons = String(parseQuery(parsePath(event.path).search).icons || "").split(",");
  if (!collectionName) return createError$1({ status: 400, message: "No collection specified" });
  if (!icons.length) return createError$1({ status: 400, message: "No icons specified" });
  if (collection) {
    const data = getIcons(
      collection,
      icons
    );
    consola.debug(`[Icon] serving ${icons.map((i) => "`" + collectionName + ":" + i + "`").join(",")} from bundled collection`);
    return data;
  }
  if (options.fallbackToApi === true || options.fallbackToApi === "server-only") {
    const apiUrl = new URL(`./${collectionName}.json?icons=${icons.join(",")}`, apiEndPoint);
    consola.debug(`[Icon] fetching ${icons.map((i) => "`" + collectionName + ":" + i + "`").join(",")} from iconify api`);
    if (apiUrl.host !== new URL(apiEndPoint).host) {
      return createError$1({ status: 400, message: "Invalid icon request" });
    }
    try {
      const data = await $fetch(apiUrl.href);
      return data;
    } catch (e) {
      consola.error(e);
      if (e.status === 404)
        return createError$1({ status: 404 });
      else
        return createError$1({ status: 500, message: "Failed to fetch fallback icon" });
    }
  }
  return createError$1({ status: 404 });
}, {
  group: "nuxt",
  name: "icon",
  getKey(event) {
    const collection = event.context.params?.collection?.replace(/\.json$/, "") || "unknown";
    const icons = String(parseQuery(parsePath(event.path).search).icons || "").split(",");
    return `${collection}_${icons[0]}_${icons.length}_${hash$1(icons.join(","))}`;
  },
  swr: true,
  maxAge: 60 * 60 * 24 * 7
  // 1 week
});

const _SxA8c9 = defineEventHandler(() => {});

const _lazy_uPxO7q = () => import('../routes/api/index.get.mjs');
const _lazy_5xRP6y = () => import('../routes/api/ai/messages.get.mjs');
const _lazy_EivklZ = () => import('../routes/api/ai/sessions.get.mjs');
const _lazy_YvDJtI = () => import('../routes/api/auth/login.post.mjs');
const _lazy_26kfZk = () => import('../routes/api/auth/logout.post.mjs');
const _lazy_cT6HGt = () => import('../routes/api/auth/register.post.mjs');
const _lazy_urSk5t = () => import('../routes/api/index.get2.mjs');
const _lazy_eRHDZY = () => import('../routes/api/documents/issues/create.post.mjs');
const _lazy_FyWrU_ = () => import('../routes/api/documents/issues/list.get.mjs');
const _lazy_H6_w5k = () => import('../routes/api/documents/issues/messages.get.mjs');
const _lazy_ykEpTu = () => import('../routes/api/documents/issues/messages.post.mjs');
const _lazy_H1PXax = () => import('../routes/api/documents/issues/resolve.post.mjs');
const _lazy_lzEJL_ = () => import('../routes/api/documents/upload.post.mjs');
const _lazy_djgQoL = () => import('../routes/api/employee/ledger.get.mjs');
const _lazy_Kh6c_g = () => import('../routes/api/employee/my-offices.get.mjs');
const _lazy_PLnqES = () => import('../routes/api/index.delete.mjs');
const _lazy_REIzgA = () => import('../routes/api/index.get3.mjs');
const _lazy_kf8g6Z = () => import('../routes/api/index.post.mjs');
const _lazy_lpgzmw = () => import('../routes/api/index.put.mjs');
const _lazy_eR4ZwR = () => import('../routes/api/org/getOrdCode.post.mjs');
const _lazy_WsCzKd = () => import('../routes/api/org/getorg.post.mjs');
const _lazy_M0lR49 = () => import('../routes/api/index.post2.mjs');
const _lazy_PsidSz = () => import('../routes/api/index.post3.mjs');
const _lazy_nryhJZ = () => import('../routes/api/rag/query.mjs');
const _lazy_tGJDz4 = () => import('../routes/api/index.delete2.mjs');
const _lazy_0QESqp = () => import('../routes/api/index.get4.mjs');
const _lazy_Y2850R = () => import('../routes/api/index.post4.mjs');
const _lazy_g4qwAb = () => import('../routes/api/index.put2.mjs');
const _lazy_p6cYnj = () => import('../routes/api/index.get5.mjs');
const _lazy_0090ut = () => import('../routes/api/tracking/advance.post.mjs');
const _lazy_YQbxm8 = () => import('../routes/api/tracking/dropoff.post.mjs');
const _lazy_ba1_Q8 = () => import('../routes/api/tracking/pickup.post.mjs');
const _lazy_x4c2Go = () => import('../routes/api/tracking/queue.get.mjs');
const _lazy_aqSFpu = () => import('../routes/api/tracking/timeline.get.mjs');
const _lazy_w_8VFz = () => import('../routes/api/users/getUserUnderOrg.post.mjs');
const _lazy_SHgQEs = () => import('../routes/api/users/org-members.get.mjs');
const _lazy_4vbCbG = () => import('../routes/api/users/provision.post.mjs');
const _lazy_wyxqy2 = () => import('../routes/api/users/remove.delete.mjs');
const _lazy__LahGT = () => import('../routes/api/users/toggle-status.post.mjs');
const _lazy_Xu6TVX = () => import('../routes/renderer.mjs').then(function (n) { return n.r; });

const handlers = [
  { route: '/api/account_type', handler: _lazy_uPxO7q, lazy: true, middleware: false, method: "get" },
  { route: '/api/ai/messages', handler: _lazy_5xRP6y, lazy: true, middleware: false, method: "get" },
  { route: '/api/ai/sessions', handler: _lazy_EivklZ, lazy: true, middleware: false, method: "get" },
  { route: '/api/auth/login', handler: _lazy_YvDJtI, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/logout', handler: _lazy_26kfZk, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/register', handler: _lazy_cT6HGt, lazy: true, middleware: false, method: "post" },
  { route: '/api/documents', handler: _lazy_urSk5t, lazy: true, middleware: false, method: "get" },
  { route: '/api/documents/issues/create', handler: _lazy_eRHDZY, lazy: true, middleware: false, method: "post" },
  { route: '/api/documents/issues/list', handler: _lazy_FyWrU_, lazy: true, middleware: false, method: "get" },
  { route: '/api/documents/issues/messages', handler: _lazy_H6_w5k, lazy: true, middleware: false, method: "get" },
  { route: '/api/documents/issues/messages', handler: _lazy_ykEpTu, lazy: true, middleware: false, method: "post" },
  { route: '/api/documents/issues/resolve', handler: _lazy_H1PXax, lazy: true, middleware: false, method: "post" },
  { route: '/api/documents/upload', handler: _lazy_lzEJL_, lazy: true, middleware: false, method: "post" },
  { route: '/api/employee/ledger', handler: _lazy_djgQoL, lazy: true, middleware: false, method: "get" },
  { route: '/api/employee/my-offices', handler: _lazy_Kh6c_g, lazy: true, middleware: false, method: "get" },
  { route: '/api/office', handler: _lazy_PLnqES, lazy: true, middleware: false, method: "delete" },
  { route: '/api/office', handler: _lazy_REIzgA, lazy: true, middleware: false, method: "get" },
  { route: '/api/office', handler: _lazy_kf8g6Z, lazy: true, middleware: false, method: "post" },
  { route: '/api/office', handler: _lazy_lpgzmw, lazy: true, middleware: false, method: "put" },
  { route: '/api/org/getOrdCode', handler: _lazy_eR4ZwR, lazy: true, middleware: false, method: "post" },
  { route: '/api/org/getorg', handler: _lazy_WsCzKd, lazy: true, middleware: false, method: "post" },
  { route: '/api/org', handler: _lazy_M0lR49, lazy: true, middleware: false, method: "post" },
  { route: '/api/ping', handler: _lazy_PsidSz, lazy: true, middleware: false, method: "post" },
  { route: '/api/rag/query', handler: _lazy_nryhJZ, lazy: true, middleware: false, method: undefined },
  { route: '/api/stages', handler: _lazy_tGJDz4, lazy: true, middleware: false, method: "delete" },
  { route: '/api/stages', handler: _lazy_0QESqp, lazy: true, middleware: false, method: "get" },
  { route: '/api/stages', handler: _lazy_Y2850R, lazy: true, middleware: false, method: "post" },
  { route: '/api/stages', handler: _lazy_g4qwAb, lazy: true, middleware: false, method: "put" },
  { route: '/api/test', handler: _lazy_p6cYnj, lazy: true, middleware: false, method: "get" },
  { route: '/api/tracking/advance', handler: _lazy_0090ut, lazy: true, middleware: false, method: "post" },
  { route: '/api/tracking/dropoff', handler: _lazy_YQbxm8, lazy: true, middleware: false, method: "post" },
  { route: '/api/tracking/pickup', handler: _lazy_ba1_Q8, lazy: true, middleware: false, method: "post" },
  { route: '/api/tracking/queue', handler: _lazy_x4c2Go, lazy: true, middleware: false, method: "get" },
  { route: '/api/tracking/timeline', handler: _lazy_aqSFpu, lazy: true, middleware: false, method: "get" },
  { route: '/api/users/getUserUnderOrg', handler: _lazy_w_8VFz, lazy: true, middleware: false, method: "post" },
  { route: '/api/users/org-members', handler: _lazy_SHgQEs, lazy: true, middleware: false, method: "get" },
  { route: '/api/users/provision', handler: _lazy_4vbCbG, lazy: true, middleware: false, method: "post" },
  { route: '/api/users/remove', handler: _lazy_wyxqy2, lazy: true, middleware: false, method: "delete" },
  { route: '/api/users/toggle-status', handler: _lazy__LahGT, lazy: true, middleware: false, method: "post" },
  { route: '/__nuxt_error', handler: _lazy_Xu6TVX, lazy: true, middleware: false, method: undefined },
  { route: '/api/_nuxt_icon/:collection', handler: _jv1OlN, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_Xu6TVX, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp = createNitroApp();
function useNitroApp() {
  return nitroApp;
}
runNitroPlugins(nitroApp);

export { decodePath as $, analyzeDocument as A, assertMethod as B, ensureSession as C, fetchRecentMessages as D, fetchLatestDocumentPayload as E, persistMessage as F, classifyIntent as G, reviseDocumentPayload as H, ISSUE_ALLOWED_ROLES as I, wantsSpreadsheetFormat as J, generateConversationalReply as K, translateTextToQuery as L, generateDocumentTemplate as M, synthesizeDocumentPayload as N, eventHandler as O, buildAssetsURL as P, publicAssetsURL as Q, useRuntimeConfig as R, encodePath as S, defineRenderHandler as T, UUID_REGEX as U, destr as V, getRouteRules as W, getResponseStatusText as X, getResponseStatus as Y, klona as Z, parseURL as _, useServerSupabase as a, hasProtocol as a0, isScriptProtocol as a1, joinURL as a2, defuFn as a3, sanitizeStatusCode as a4, getRequestHeader as a5, isEqual as a6, getContext as a7, $fetch$1 as a8, baseURL as a9, hash$1 as aa, defu as ab, executeAsync as ac, withTrailingSlash as ad, withoutTrailingSlash as ae, getQuery as b, createError$1 as c, defineEventHandler as d, readBody as e, deleteCookie as f, getRouteRulesForPath as g, parseScope as h, resolveActorContextWithOffices as i, assertDocumentOrgAccess as j, assertReportingOfficeAccess as k, listSessions as l, broadcastIssueRealtime as m, issueRealtimeChannel as n, orgLogisticsChannel as o, parseQuery as p, assertIssueOrgAccess as q, resolveTenant as r, setCookie as s, toNodeListener as t, useNitroApp as u, getCookie as v, withQuery as w, readMultipartFormData as x, analyzeDocumentBuffer as y, extractTextFromFile as z };
//# sourceMappingURL=nitro.mjs.map
