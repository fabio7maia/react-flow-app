import{R as t}from"./index-D4lIrffr.js";import{L as A}from"./logger.helper-B8kJPxwa.js";class Q{static writeStory(l){const{component:s,args:p,group:m="General"}=l,c=o=>t.createElement(s,{...o}),r={};return p&&Object.keys(p).forEach(o=>{r[o]=c.bind({}),r[o].args=p[o]}),{meta:{title:`${m}/${s.displayName}`,component:s,decorators:[(o,b)=>o()]},template:c,stories:r}}}const k=e=>e,z=e=>{const{back:l,dispatch:s,currentFlowName:p,fm:m,refresh:c}=t.useContext(S),r=m==null?void 0:m.getFlow(p),o=t.useCallback((V,U)=>{s(e,V,U)},[s,e]),b=t.useCallback((r==null?void 0:r.getCurrentStep)||(()=>k()),[r]),P=t.useCallback((r==null?void 0:r.getHistory)||(()=>k([])),[r]),L=t.useCallback((r==null?void 0:r.getLastAction)||(()=>k()),[r]),n=t.useCallback((r==null?void 0:r.getPreviousStep)||(()=>k()),[r]),y=t.useCallback((r==null?void 0:r.hasPreviousStep)||(()=>k(!1)),[r]),i=t.useCallback((r==null?void 0:r.clearHistory)||(()=>k()),[r]);return t.useMemo(()=>({back:()=>{l==null||l()},clearHistory:i,dispatch:o,getCurrentStep:b,getHistory:P,getLastAction:L,getPreviousStep:n,hasPreviousStep:y,refresh:()=>{c==null||c()}}),[l,i,b,P,L,n,o,y,c])},X=()=>{const{currentFlowName:e,start:l,fm:s}=t.useContext(S),p=t.useCallback(({flowName:m,stepName:c,options:r})=>{l(m,c,r)},[l]);return t.useMemo(()=>({currentFlowName:e,start:p,clearAllHistory:s.clearAllHistory}),[e,s.clearAllHistory,p])};try{z.displayName="useFlow",z.__docgenInfo={description:"",displayName:"useFlow",props:{actions:{defaultValue:null,description:"",name:"actions",required:!0,type:{name:"any"}},loader:{defaultValue:null,description:"",name:"loader",required:!1,type:{name:"() => LazyExoticComponent<ComponentType<any>>"}},url:{defaultValue:null,description:"",name:"url",required:!1,type:{name:"string"}}}}}catch{}const H=e=>t.useCallback(()=>({error:A.error(e),log:A.log(e),warn:A.error(e)}),[e])(),B=()=>H("Flow");try{H.displayName="useLogger",H.__docgenInfo={description:"",displayName:"useLogger",props:{}}}catch{}const I={animation:!0,withUrl:!0},S=t.createContext({fm:void 0,currentFlowName:"",options:{animation:!1,withUrl:!1},start:(e,l,s)=>{},back:()=>{},dispatch:(e,l,s)=>{},refresh:()=>{}}),G=({fm:e,initialFlowName:l,children:s,initialStepName:p,options:m,onFlowMount:c,onFlowUnmount:r,listen:o,initialHistory:b})=>{var D;const[P,L]=t.useState(0),n=t.useRef(l),y=t.useRef(e.getFlow(n.current)),i=B(),V=t.useRef(!1),{animation:U=I.animation,withUrl:E=I.withUrl}=m||I,M={animation:U,withUrl:E},F=t.useRef(void 0),w=t.useCallback(()=>{y.current=e.getFlow(n.current),L(a=>a+1)},[e]),C=t.useCallback(a=>{E&&(i.log("FlowProvider > updateLocationUrl",{url:`#${a}`}),a&&window.history.replaceState(null,null,`#${a}`))},[i,E]),g=t.useCallback((a,f,h,u,d=!1,_=!1)=>{i.log("FlowProvider > handleStart",{flowName:a});const v=e.getFlow(a);u=u||(d?void 0:n.current);const{changed:q,historyUrl:x,currentFlowName:N}=(v==null?void 0:v.start(f,u,h,_,b))||{};if(q){if(N&&N!==a){const{fromFlowName:R}=e.getFlow(N);return g(N,void 0,void 0,R,!0,_)}n.current=a,C(x),w()}},[e,w,b,i,C]),T=t.useCallback(()=>{var d;const{changed:a,currentFlowName:f,currentStepName:h,historyUrl:u}=((d=y.current)==null?void 0:d.back())||{};if(i.log("FlowProvider > back",{changed:a,currentFlowName:n}),a&&(o==null||o({currentStepName:"",flowName:n.current,type:"back",url:u})),a&&f!==n.current){const{fromFlowName:_}=e.getFlow(f);g(f,h,void 0,_,!0,!0)}else a&&(C(u),w())},[e,w,g,o,i,C]),O=t.useCallback((a,f,h)=>{var N;const{changed:u,currentFlowName:d,currentStepName:_,historyUrl:v,clearHistory:q,ignoreHistory:x}=((N=y.current)==null?void 0:N.dispatch(a,f,h))||{};if(i.log("FlowProvider > dispatch",{name:f,payload:h,changed:u}),u&&(o==null||o({currentStepName:"",flowName:d||n.current,type:"dispatch",url:v,dispatch:{actionName:f,payload:h},options:{clearHistory:q,ignoreHistory:x}})),d&&d!==n.current)if(q){const{fromFlowName:R}=e.getFlow(d);return g(d,_,void 0,R)}else return g(d,_);else u&&w();C(v)},[e,w,g,o,i,C]),$=t.useCallback(()=>{w()},[w]);V.current||(V.current=!0,g(n.current,p));const W=t.useMemo(()=>{var a;return{fm:e,currentFlowName:(a=y.current)==null?void 0:a.name,start:g,back:T,dispatch:O,refresh:$,options:M}},[e,T,O,$,g,M]);return t.useEffect(()=>{if(F.current&&F.current!==n.current&&r){const a=r[F.current];a==null||a()}if((!F.current||F.current!==n.current)&&c){F.current=n.current;const a=c[n.current];a==null||a()}},[P,e,c,r]),i.log("FlowProvider",{flow:y.current,currentFlowName:n.current,lastFlowName:F.current}),t.createElement(S.Provider,{value:W},s||((D=y.current)==null?void 0:D.render(M)))};try{S.displayName="flowManagerContext",S.__docgenInfo={description:"",displayName:"flowManagerContext",props:{}}}catch{}try{G.displayName="FlowProvider",G.__docgenInfo={description:"",displayName:"FlowProvider",props:{fm:{defaultValue:null,description:"",name:"fm",required:!0,type:{name:"FlowManager<any, any, any, any>"}},initialFlowName:{defaultValue:null,description:"",name:"initialFlowName",required:!0,type:{name:"string | number | symbol"}},initialStepName:{defaultValue:null,description:"",name:"initialStepName",required:!1,type:{name:"string"}},initialHistory:{defaultValue:null,description:"",name:"initialHistory",required:!1,type:{name:"string[]"}},options:{defaultValue:null,description:"",name:"options",required:!1,type:{name:"TFlowManagerOptions"}},onFlowMount:{defaultValue:null,description:"List of handlers by flows called when specific flow name is mounted",name:"onFlowMount",required:!1,type:{name:"Partial<Record<keyof TFlows, () => void>>"}},onFlowUnmount:{defaultValue:null,description:"List of handlers by flows called when specific flow name is unmounted",name:"onFlowUnmount",required:!1,type:{name:"Partial<Record<keyof TFlows, () => void>>"}},listen:{defaultValue:null,description:"",name:"listen",required:!1,type:{name:"(input: TFlowListenCallbackInput) => void"}}}}}catch{}const j=({children:e,loading:l})=>{const{log:s}=H("components");return s("Placeholder > render",{loading:l}),t.createElement(t.Fragment,null,l&&t.createElement("div",{className:"placeholder-load-wrapper"},t.createElement("div",{className:"placeholder-activity"})),!l&&t.createElement(t.Fragment,null,e))};try{j.displayName="Placeholder",j.__docgenInfo={description:"",displayName:"Placeholder",props:{loading:{defaultValue:null,description:"",name:"loading",required:!0,type:{name:"boolean"}},style:{defaultValue:null,description:"",name:"style",required:!1,type:{name:"CSSProperties"}}}}}catch{}export{G as F,j as P,Q as S,B as a,X as b,S as f,z as u};
