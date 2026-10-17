/* Tiny runtime for the wedding pages: renders the page template with Preact. */
(function () {
  var h = preact.h, render = preact.render, PC = preact.Component, Fragment = preact.Fragment;
  var ASSETS = window.__ASSETS || {};
  var BOOL = { autoplay: 1, muted: 1, loop: 1, playsinline: 1, controls: 1, disabled: 1, checked: 1, required: 1, readonly: 1, hidden: 1 };
  var EVT = { onChange: 'onInput' };
  function get(ctx, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.'), v = ctx;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function fixUrl(s) {
    return s.indexOf('/_blob/') === -1 ? s : s.replace(/\/_blob\/([0-9a-f]{32})/g, function (_, id) { return ASSETS[id] || ('assets/' + id); });
  }
  function interp(str, ctx, raw) {
    var m = /^\{\{([^}]+)\}\}$/.exec(str);
    if (m && raw) { var v = get(ctx, m[1]); return typeof v === 'string' ? fixUrl(v) : v; }
    if (str.indexOf('{{') === -1) return fixUrl(str);
    return fixUrl(str.replace(/\{\{([^}]+)\}\}/g, function (_, p) { var v = get(ctx, p); return v == null || typeof v === 'function' ? '' : String(v); }));
  }
  function build(nodes, ctx) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (typeof n === 'string') { out.push(interp(n, ctx, false)); continue; }
      if (n.t === 'sc-for') {
        var list = get(ctx, /\{\{([^}]+)\}\}/.exec(n.a.list)[1]) || [];
        var as = n.a.as || 'item';
        var group = [];
        for (var k = 0; k < list.length; k++) {
          var c2 = Object.assign({}, ctx); c2[as] = list[k]; c2.$index = k;
          group.push.apply(group, build(n.c, c2));
        }
        out.push(group); // keep one stable slot so siblings are never re-created
        continue;
      }
      if (n.t === 'sc-if') {
        out.push(get(ctx, /\{\{([^}]+)\}\}/.exec(n.a.value)[1]) ? build(n.c, ctx) : null); // stable slot
        continue;
      }
      var props = {};
      for (var key in n.a) {
        if (key.indexOf('hint-') === 0) continue;
        var val = n.a[key];
        if (/^on[A-Z]/.test(key)) {
          var fn = interp(val, ctx, true);
          if (typeof fn === 'function') props[(n.t === 'input' || n.t === 'textarea') && EVT[key] ? EVT[key] : key] = fn;
          continue;
        }
        var v = interp(val, ctx, true);
        if (BOOL[key.toLowerCase()] && (v === '' || v === 'true' || v === true)) v = true;
        if (key === 'class') key = 'class';
        props[key] = v;
      }
      if (n.t === 'video' && props.muted) props.muted = true;
      out.push(h.apply(null, [n.t, props].concat(build(n.c || [], ctx))));
    }
    return out;
  }
  window.DCLogic = function DCLogic(props) { this.props = props || {}; this.state = {}; };
  window.DCLogic.prototype.setState = function (o) {
    var next = typeof o === 'function' ? o(this.state) : o;
    this.state = Object.assign({}, this.state, next);
    if (this.__host) this.__host.forceUpdate();
  };
  window.mountDC = function (Logic, tree, el) {
    function Host() { PC.call(this); this.logic = new Logic({}); this.logic.__host = this; }
    Host.prototype = Object.create(PC.prototype);
    Host.prototype.render = function () { return h(Fragment, null, build(tree, this.logic.renderVals())); };
    Host.prototype.componentDidMount = function () { if (this.logic.componentDidMount) this.logic.componentDidMount(); };
    Host.prototype.componentDidUpdate = function () { if (this.logic.componentDidUpdate) this.logic.componentDidUpdate(); };
    Host.prototype.componentWillUnmount = function () { if (this.logic.componentWillUnmount) this.logic.componentWillUnmount(); };
    render(h(Host, null), el);
  };
})();
