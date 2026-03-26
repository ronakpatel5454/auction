import{r as s,j as i}from"./index-DlO5YNNF.js";/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=(...e)=>e.filter((t,r,o)=>!!t&&t.trim()!==""&&o.indexOf(t)===r).join(" ").trim();/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,r,o)=>o?o.toUpperCase():r.toLowerCase());/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=e=>{const t=j(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var l={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1},b=s.createContext({}),v=()=>s.useContext(b),W=s.forwardRef(({color:e,size:t,strokeWidth:r,absoluteStrokeWidth:o,className:n="",children:a,iconNode:x,...d},h)=>{const{size:c=24,strokeWidth:u=2,absoluteStrokeWidth:C=!1,color:f="currentColor",className:g=""}=v()??{},w=o??C?Number(r??u)*24/Number(t??c):r??u;return s.createElement("svg",{ref:h,...l,width:t??c??l.width,height:t??c??l.height,stroke:e??f,strokeWidth:w,className:p("lucide",g,n),...!a&&!A(d)&&{"aria-hidden":"true"},...d},[...x.map(([k,L])=>s.createElement(k,L)),...Array.isArray(a)?a:[a]])});/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=(e,t)=>{const r=s.forwardRef(({className:o,...n},a)=>s.createElement(W,{ref:a,iconNode:t,className:p(`lucide-${y(m(e))}`,`lucide-${e}`,o),...n}));return r.displayName=m(e),r};/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],E=N("loader-circle",S),z=({message:e="Loading..."})=>i.jsxs("div",{className:"flex flex-col items-center justify-center gap-4",style:{padding:"3rem"},children:[i.jsx(E,{className:"animate-spin",size:48,color:"var(--accent-green)"}),i.jsx("p",{className:"text-muted",style:{fontFamily:"var(--font-heading)",letterSpacing:"1px"},children:e})]});export{z as L,N as c};
