let expr = "",
  memory = 0,
  hasMem = false,
  hist = [],
  angleMode = "deg",
  justCalc = false;
const dMain = document.getElementById("dMain"),
  dExpr = document.getElementById("dExpr"),
  dHist = document.getElementById("dHist"),
  computing = document.getElementById("computing");

function toggleTheme() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
  document.getElementById("themeKnob").textContent = dark ? "☀️" : "🌙";
  document.getElementById("themeLbl").textContent = dark ? "Kunduz" : "Tun";
}
function showPage(n) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-link")
    .forEach((l) => l.classList.remove("active"));
  document.getElementById("page-" + n).classList.add("active");
  document.getElementById("nav-" + n).classList.add("active");
}
function toggleMode() {
  angleMode = angleMode === "deg" ? "rad" : "deg";
  document.getElementById("modeBadge").textContent =
    angleMode === "deg" ? "DARAJA" : "RADIAN";
}
function setMain(v, e) {
  dMain.textContent = v;
  dMain.className = "d-main" + (e ? " err" : "");
}
function ap(ch) {
  if (justCalc && "0123456789.".includes(ch)) expr = "";
  justCalc = false;
  expr += ch;
  dExpr.textContent = expr;
  setMain(expr.slice(-22) || "0");
}
function ins(ch) {
  justCalc = false;
  expr += ch;
  dExpr.textContent = expr;
  setMain(expr.slice(-22));
}
function del() {
  justCalc = false;
  expr = expr.slice(0, -1);
  dExpr.textContent = expr;
  setMain(expr.slice(-22) || "0");
}
function ac() {
  expr = "";
  justCalc = false;
  dExpr.textContent = "";
  dHist.textContent = "";
  setMain("0");
}
function sign() {
  if (!expr) return;
  expr = expr.startsWith("-") ? expr.slice(1) : "-" + expr;
  dExpr.textContent = expr;
  setMain(expr.slice(-22));
}

function jsEval(e) {
  try {
    const r = angleMode === "deg" ? Math.PI / 180 : 1;
    let s = e
      .replace(/÷/g, "/")
      .replace(/×/g, "*")
      .replace(/−/g, "-")
      .replace(/π/g, String(Math.PI))
      .replace(/\^/g, "**")
      .replace(/sin\(/g, `Math.sin(${r}*`)
      .replace(/cos\(/g, `Math.cos(${r}*`)
      .replace(/tan\(/g, `Math.tan(${r}*`)
      .replace(/sqrt\(/g, "Math.sqrt(")
      .replace(/log\(/g, "Math.log10(")
      .replace(/ln\(/g, "Math.log(");
    const res = Function('"use strict";return(' + s + ")")();
    return isFinite(res) ? { result: res } : { error: "Aniqlanmagan natija" };
  } catch {
    return { error: "Sintaksis xatosi" };
  }
}
function jsFn(a, val) {
  const v = parseFloat(val),
    r = angleMode === "deg" ? Math.PI / 180 : 1;
  if (a === "sin") return { result: Math.sin(v * r) };
  if (a === "cos") return { result: Math.cos(v * r) };
  if (a === "tan") return { result: Math.tan(v * r) };
  if (a === "sqrt")
    return v >= 0
      ? { result: Math.sqrt(v) }
      : { error: "Manfiy son ildizi yo'q" };
  if (a === "pow2") return { result: Math.pow(v, 2) };
  if (a === "pow3") return { result: Math.pow(v, 3) };
  if (a === "log")
    return v > 0 ? { result: Math.log10(v) } : { error: "Domen xatosi" };
  if (a === "ln")
    return v > 0 ? { result: Math.log(v) } : { error: "Domen xatosi" };
  if (a === "fact") {
    if (v < 0 || v !== Math.floor(v))
      return { error: "Musbat butun son kerak" };
    let f = 1;
    for (let i = 2; i <= v; i++) f *= i;
    return { result: f };
  }
  if (a === "inv")
    return v !== 0 ? { result: 1 / v } : { error: "Nolga bo'linmaydi" };
  if (a === "percent") return { result: v / 100 };
  return { error: "Noma'lum amal" };
}
async function callBackend(action, expression) {
  try {
    const res = await fetch("calculator.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, expression }),
    });
    return await res.json();
  } catch {
    return action === "evaluate"
      ? jsEval(expression)
      : jsFn(action, expression);
  }
}
function fmt(v) {
  if (typeof v !== "number") return String(v);
  if (!isFinite(v)) return v > 0 ? "∞" : "-∞";
  const r = parseFloat(v.toPrecision(12));
  if (Math.abs(r) >= 1e12 || (Math.abs(r) < 1e-7 && r !== 0))
    return r.toExponential(6);
  return parseFloat(r.toFixed(10)).toString();
}
function addHist(e, r) {
  hist.unshift({ e, r });
  if (hist.length > 20) hist.pop();
  document.getElementById("histList").innerHTML = hist
    .map(
      (h, i) =>
        `<div class="hist-item" onclick="useHist(${i})"><span class="h-e">${h.e}</span><span class="h-r">${h.r}</span></div>`,
    )
    .join("");
}
function useHist(i) {
  expr = String(hist[i].r);
  dExpr.textContent = "";
  setMain(expr);
  justCalc = false;
}
async function fn(a) {
  const cur = expr || "0";
  computing.classList.add("on");
  const res = await callBackend(a, cur);
  computing.classList.remove("on");
  if (res.error) {
    setMain(res.error, true);
    return;
  }
  const f = fmt(res.result);
  addHist(`${a}(${cur})`, f);
  expr = String(res.result);
  dExpr.textContent = `${a}(${cur}) =`;
  setMain(f);
  justCalc = true;
}
async function calc() {
  if (!expr) return;
  const orig = expr;
  computing.classList.add("on");
  const res = await callBackend("evaluate", expr);
  computing.classList.remove("on");
  if (res.error) {
    setMain(res.error, true);
    return;
  }
  const f = fmt(res.result);
  addHist(orig, f);
  dHist.textContent = orig + " =";
  dExpr.textContent = "";
  expr = String(res.result);
  setMain(f);
  justCalc = true;
}
function toggleHist() {
  document.getElementById("histPanel").classList.toggle("open");
}
function mStore() {
  const v = parseFloat(expr || "0");
  if (!isNaN(v)) {
    memory = v;
    hasMem = true;
    document.getElementById("memInd").classList.add("on");
  }
}
function mRecall() {
  if (hasMem) {
    expr = String(memory);
    dExpr.textContent = expr;
    setMain(fmt(memory));
  }
}
function mClear() {
  memory = 0;
  hasMem = false;
  document.getElementById("memInd").classList.remove("on");
}
function mAdd() {
  const v = parseFloat(expr || "0");
  if (!isNaN(v)) {
    memory += v;
    hasMem = true;
    document.getElementById("memInd").classList.add("on");
  }
}
function mSub() {
  const v = parseFloat(expr || "0");
  if (!isNaN(v)) {
    memory -= v;
    hasMem = true;
    document.getElementById("memInd").classList.add("on");
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key >= "0" && e.key <= "9") ap(e.key);
  else if (e.key === ".") ap(".");
  else if (e.key === "+") ap("+");
  else if (e.key === "-") ap("−");
  else if (e.key === "*") ap("×");
  else if (e.key === "/") {
    e.preventDefault();
    ap("÷");
  } else if (e.key === "^") ap("^");
  else if (e.key === "(") ap("(");
  else if (e.key === ")") ap(")");
  else if (e.key === "Enter" || e.key === "=") calc();
  else if (e.key === "Backspace") del();
  else if (e.key === "Escape") ac();
});
