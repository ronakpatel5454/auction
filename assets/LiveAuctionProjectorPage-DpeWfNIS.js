import{u as he,r as o,j as e,L as ge}from"./index-CJa5VaLg.js";import{s as f}from"./supabase-j5CbjUjn.js";import{L as be}from"./Loader-M6mtH_Uh.js";import{g as j}from"./cloudinary-UEWUm3X2.js";const je=()=>{var B,M,N,T,O,F,U,Q,G,Y,Z,q,$,H,J,V,K,X,P,ee;const[ae]=he(),v=ae.get("code"),[k,ie]=o.useState([]),[se,oe]=o.useState(!0),[p,S]=o.useState(null),[t,u]=o.useState(null),[_,w]=o.useState([]),[z,L]=o.useState(!1),[s,W]=o.useState(null),[I,C]=o.useState(!1),[l,R]=o.useState(null),[n,ne]=o.useState(window.innerWidth<=700),[a,le]=o.useState(window.innerWidth<=600),[ce,E]=o.useState(!1),[pe,D]=o.useState(!1),[de,A]=o.useState(!1),g=o.useRef(new Set);o.useEffect(()=>{const r=()=>{ne(window.innerWidth<=700),le(window.innerWidth<=600)};return window.addEventListener("resize",r),()=>window.removeEventListener("resize",r)},[]);const x=async()=>{try{console.log("Fetching fresh projector data...");let r=null;if(v){const{data:i}=await f.from("auctions").select("*").eq("auction_code",v).maybeSingle();r=i}else{const{data:i,error:d}=await f.from("auctions").select("*").neq("status","draft").order("created_at",{ascending:!1});if(d)throw d;ie(i||[]),S(null),w([]),u(null);return}if(S(r),r){const{data:i}=await f.from("auction_teams").select("*").eq("auction_id",r.id);w(i||[]);const{data:d}=await f.from("auction_players").select("*, players(*)").eq("auction_id",r.id).eq("auction_status","active").limit(1).maybeSingle();u(d||null)}else w([]),u(null)}catch(r){console.error("Projector fetch error:",r)}finally{oe(!1)}},xe=async r=>{const i=`${r.id}-sold`;if(g.current.has(i)){console.log("Duplicate sold event ignored for player:",r.id);return}g.current.add(i);const{data:d}=await f.from("auction_players").select("*, players(*)").eq("id",r.id).single();d&&(W(d),L(!0),setTimeout(()=>{L(!1),W(null),x()},8e3))},fe=async r=>{const i=`${r.id}-unsold`;if(g.current.has(i)){console.log("Duplicate unsold event ignored for player:",r.id);return}g.current.add(i);const{data:d}=await f.from("auction_players").select("*, players(*)").eq("id",r.id).single();d&&(R(d),C(!0),setTimeout(()=>{C(!1),R(null),x()},8e3))};if(o.useEffect(()=>{x();const r=f.channel("projector_sync_channel").on("postgres_changes",{event:"*",schema:"public",table:"auction_players"},h=>{var re;console.log("Realtime Player Event:",h.eventType,(re=h.new)==null?void 0:re.auction_status);const{new:c,old:te,eventType:me}=h;c.auction_status==="sold"?xe(c):c.auction_status==="unsold"?fe(c):(c.auction_status==="active"&&(g.current.delete(`${c.id}-sold`),g.current.delete(`${c.id}-unsold`)),me==="UPDATE"&&c.auction_status==="active"&&te&&te.auction_status==="active"?u(y=>y&&y.id===c.id?{...y,current_bid_price:c.current_bid_price,current_bid_team_id:c.current_bid_team_id,previous_bid_price:c.previous_bid_price,previous_bid_team_id:c.previous_bid_team_id}:(x(),y)):x())}).on("postgres_changes",{event:"*",schema:"public",table:"auctions"},()=>{console.log("Realtime Auction Event triggered refresh"),x()}).subscribe((h,c)=>{console.log("Realtime Status:",h),h==="SUBSCRIPTION_ERROR"&&console.error("Realtime Subscription Error:",c),h==="SUBSCRIBED"&&x()}),i=()=>{document.visibilityState==="visible"&&(console.log("Tab focused, syncing projector..."),x())};document.addEventListener("visibilitychange",i);const d=setInterval(()=>{console.log("Heartbeat sync..."),x()},3e4);return()=>{f.removeChannel(r),document.removeEventListener("visibilitychange",i),clearInterval(d)}},[v]),o.useEffect(()=>{E(!1)},[t==null?void 0:t.id]),o.useEffect(()=>{D(!1)},[s==null?void 0:s.id]),o.useEffect(()=>{A(!1)},[l==null?void 0:l.id]),se)return e.jsx(be,{message:"CALIBRATING PROJECTOR..."});const b=t!=null&&t.current_bid_team_id?_.find(r=>r.id===t.current_bid_team_id):null,m=s!=null&&s.team_id?_.find(r=>r.id===s.team_id):null;return e.jsxs("div",{style:{backgroundColor:"#050a10",minHeight:"100vh",color:"#fff",position:"relative",overflow:"hidden",padding:"clamp(12px, 2vw, 32px)",boxSizing:"border-box"},children:[e.jsx("div",{style:{position:"absolute",top:"-20%",left:"-10%",borderRadius:"50%",zIndex:0,pointerEvents:"none",width:"clamp(300px, 50vw, 600px)",height:"clamp(300px, 50vw, 600px)",background:"radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)"}}),e.jsx("div",{style:{position:"absolute",bottom:"-20%",right:"-10%",borderRadius:"50%",zIndex:0,pointerEvents:"none",width:"clamp(400px, 60vw, 800px)",height:"clamp(400px, 60vw, 800px)",background:"radial-gradient(circle, rgba(57,255,20,0.05) 0%, transparent 70%)"}}),e.jsxs("div",{style:{position:"relative",zIndex:1,display:"flex",flexDirection:"column",minHeight:"calc(100vh - clamp(24px, 4vw, 64px))"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px",marginBottom:"clamp(16px, 4vh, 40px)",borderBottom:"2px solid rgba(255,255,255,0.1)",paddingBottom:"clamp(12px, 2vh, 24px)"},children:[e.jsx("h2",{style:{margin:0,textTransform:"uppercase",letterSpacing:"clamp(2px, 0.8vw, 8px)",color:"rgba(255,255,255,0.5)",fontSize:"clamp(0.75rem, 2vw, 1.5rem)"},children:(p==null?void 0:p.auction_name)||"LIVE AUCTION"}),e.jsx("div",{onClick:()=>x(),style:{padding:"0.4rem 1.2rem",background:"#ff4444",color:"#fff",fontWeight:"bold",borderRadius:"4px",letterSpacing:"4px",fontSize:"clamp(0.75rem, 1.5vw, 1rem)",animation:"pulse 1.5s infinite",whiteSpace:"nowrap",cursor:"pointer",userSelect:"none"},title:"Click to force sync",children:"LIVE"})]}),p?!t&&!z&&!I?e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"2rem"},children:[e.jsx("div",{style:{fontSize:"clamp(4rem, 15vw, 10rem)",opacity:.1,marginBottom:"2rem"},children:"🏏"}),e.jsx("h1",{style:{fontSize:"clamp(1.2rem, 4vw, 4rem)",color:"rgba(255,255,255,0.2)",margin:0},children:"WAITING FOR NEXT TURN..."})]}):e.jsxs("div",{style:{display:"grid",gridTemplateColumns:n?"1fr":"1fr 1fr",gap:n?"20px":"clamp(20px, 5vw, 60px)",flex:1,alignItems:n?"start":"center"},children:[e.jsx("div",{style:{display:"flex",flexDirection:"column",alignItems:"center"},children:e.jsxs("div",{style:{position:"relative",display:"inline-block"},children:[(t==null?void 0:t.player_number)!=null&&e.jsxs("div",{style:{position:"absolute",top:"12px",left:"12px",background:"var(--accent-gold)",color:"#000",padding:"clamp(4px, 0.8vh, 8px) clamp(8px, 1.5vw, 16px)",borderRadius:"clamp(4px, 0.8vw, 8px)",fontSize:"clamp(0.8rem, 1.5vw, 1.4rem)",fontWeight:900,zIndex:10,boxShadow:"0 4px 15px rgba(0,0,0,0.5)",border:"2px solid rgba(0,0,0,0.2)"},children:["#",t.player_number]}),(B=t==null?void 0:t.players)!=null&&B.photo_url&&!ce?e.jsx("img",{src:j(t.players.photo_url,600),alt:"Player",onError:()=>E(!0),style:{width:"auto",height:n?"clamp(200px, 60vw, 350px)":"clamp(300px, 40vw, 600px)",maxWidth:"100%",objectFit:"cover",borderRadius:"clamp(12px, 2vw, 30px)",border:"clamp(4px, 0.8vw, 8px) solid #ffd700",boxShadow:"0 0 80px rgba(255,215,0,0.2)",display:"block"}}):e.jsx("div",{style:{width:n?"clamp(200px, 60vw, 350px)":"clamp(300px, 35vw, 500px)",height:n?"clamp(200px, 60vw, 350px)":"clamp(300px, 35vw, 500px)",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, rgba(255,215,0,0.1), rgba(57,255,20,0.05))",color:"rgba(255,215,0,0.3)",fontSize:n?"clamp(4rem, 15vw, 8rem)":"clamp(6rem, 15vw, 15rem)",fontWeight:900,borderRadius:"clamp(12px, 2vw, 30px)",border:"clamp(4px, 0.8vw, 8px) solid #ffd700",boxShadow:"0 0 80px rgba(255,215,0,0.2)"},children:(((N=(M=t==null?void 0:t.players)==null?void 0:M.first_name)==null?void 0:N.charAt(0))||"")+(((O=(T=t==null?void 0:t.players)==null?void 0:T.last_name)==null?void 0:O.charAt(0))||"")}),e.jsx("div",{style:{position:"absolute",bottom:"clamp(-10px, -1.5vh, -18px)",left:"50%",transform:"translateX(-50%)",background:"#ffd700",color:"#000",padding:"clamp(4px, 1vh, 10px) clamp(12px, 2.5vw, 28px)",borderRadius:"clamp(6px, 1vw, 12px)",fontSize:n?"clamp(0.65rem, 3vw, 1rem)":"clamp(0.7rem, 1.5vw, 1.8rem)",fontWeight:900,boxShadow:"0 8px 30px rgba(0,0,0,0.5)",whiteSpace:"nowrap"},children:(U=(F=t==null?void 0:t.players)==null?void 0:F.player_role)==null?void 0:U.toUpperCase()})]})}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",justifyContent:"center",color:"#ffd700",paddingTop:"clamp(20px, 3vh, 40px)"},children:[e.jsxs("h1",{style:{fontSize:n?"clamp(1.4rem, 6vw, 2.5rem)":"clamp(1.6rem, 4.5vw, 5rem)",margin:"0 0 clamp(4px, 1vh, 12px) 0",lineHeight:1.2,textShadow:"0 8px 20px rgba(0,0,0,0.5)",wordBreak:"break-word"},children:[(Q=t==null?void 0:t.players)==null?void 0:Q.first_name," ",e.jsx("span",{children:(G=t==null?void 0:t.players)==null?void 0:G.last_name})]}),e.jsxs("div",{style:{fontSize:n?"clamp(0.7rem, 3vw, 1rem)":"clamp(0.75rem, 1.5vw, 1.8rem)",color:"rgba(255,255,255,0.7)",margin:"0 0 clamp(12px, 4vh, 40px) 0",display:"flex",flexDirection:"column",gap:"clamp(4px, 1vh, 8px)"},children:[e.jsxs("div",{style:{display:"flex",gap:"clamp(8px, 1.5vw, 20px)",flexWrap:"wrap"},children:[e.jsx("span",{style:{color:"rgba(255,255,255,0.4)",fontSize:"0.9em"},children:"Batting Style:"}),e.jsx("span",{style:{color:"var(--accent-gold)",fontWeight:600},children:((Y=t==null?void 0:t.players)==null?void 0:Y.batting_style)||"N/A"}),e.jsx("span",{style:{opacity:.3},children:"|"}),e.jsx("span",{style:{color:"rgba(255,255,255,0.4)",fontSize:"0.9em"},children:"Bowling Style:"}),e.jsx("span",{style:{color:"var(--accent-gold)",fontWeight:600},children:((Z=t==null?void 0:t.players)==null?void 0:Z.bowling_style)||"N/A"})]}),e.jsxs("div",{style:{opacity:.5},children:["State: ",(q=t==null?void 0:t.players)==null?void 0:q.state," | Base: ₹",($=p==null?void 0:p.base_price)==null?void 0:$.toLocaleString()]})]}),e.jsxs("div",{style:{background:"rgba(255,255,255,0.03)",border:"2px solid rgba(255,215,0,0.2)",padding:"clamp(12px, 3vh, 32px)",borderRadius:"clamp(12px, 2vw, 25px)",boxShadow:"0 15px 40px rgba(0,0,0,0.4)"},children:[e.jsx("div",{style:{fontSize:n?"clamp(0.6rem, 2.5vw, 0.9rem)":"clamp(0.7rem, 1.2vw, 1.4rem)",color:"#ffd700",textTransform:"uppercase",letterSpacing:"4px",marginBottom:"clamp(4px, 0.5vh, 10px)",fontWeight:"bold"},children:"Current Bid"}),e.jsxs("div",{style:{fontSize:n?"clamp(1.8rem, 8vw, 3rem)":"clamp(2rem, 7vw, 6rem)",fontWeight:900,margin:"0 0 clamp(8px, 1.5vh, 20px) 0",fontFamily:"monospace",color:b?"#39ff14":"#fff",wordBreak:"break-all"},children:["₹ ",((H=t==null?void 0:t.current_bid_price)==null?void 0:H.toLocaleString())||((J=p==null?void 0:p.base_price)==null?void 0:J.toLocaleString())]}),b?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"clamp(8px, 1.5vw, 20px)",padding:"clamp(8px, 1.5vh, 16px)",background:"rgba(57,255,20,0.1)",borderRadius:"clamp(8px, 1vw, 15px)",border:"1px solid #39ff14",flexWrap:"wrap"},children:[b.logo_url&&e.jsx("img",{src:b.logo_url,alt:"Team",style:{width:"clamp(28px, 5vw, 70px)",height:"clamp(28px, 5vw, 70px)",objectFit:"contain",flexShrink:0}}),e.jsx("div",{style:{fontSize:n?"clamp(0.9rem, 4vw, 1.4rem)":"clamp(1rem, 2.5vw, 2rem)",fontWeight:"bold",color:"#39ff14"},children:b.team_name})]}):e.jsx("div",{style:{fontSize:n?"clamp(0.9rem, 4vw, 1.4rem)":"clamp(1rem, 2.5vw, 2rem)",fontWeight:"bold",color:"#ff4444",animation:"flash 1s infinite"},children:"OPENING BID..."})]}),(t==null?void 0:t.current_bid_price)>=2e4&&e.jsxs("div",{style:{marginTop:"clamp(12px, 2vh, 24px)",background:"rgba(255, 255, 255, 0.03)",border:"2px solid rgba(255, 215, 0, 0.4)",padding:"clamp(10px, 2vh, 20px)",borderRadius:"clamp(12px, 2vw, 20px)",boxShadow:"0 10px 30px rgba(0,0,0,0.5)",display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:"clamp(10px, 2vw, 20px)",animation:"slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both, goldGlowPulse 2s infinite ease-in-out",backdropFilter:"blur(10px)"},children:[e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",justifyContent:"center"},children:[e.jsx("div",{style:{fontSize:n?"clamp(0.9rem, 3.5vw, 1.3rem)":"clamp(1.1rem, 2vw, 1.8rem)",fontWeight:900,color:"#ffd700",textShadow:"0 0 12px rgba(255,215,0,0.5)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Sab Changa Si!"}),e.jsxs("div",{style:{fontSize:n?"clamp(0.7rem, 2.5vw, 0.95rem)":"clamp(0.8rem, 1.2vw, 1.1rem)",color:"rgba(255, 255, 255, 0.85)",lineHeight:1.4},children:["The current bid is ",e.jsxs("span",{style:{color:"#ffd700",fontWeight:"bold"},children:["₹",t.current_bid_price.toLocaleString()]}),"! 🔥"]})]}),e.jsx("div",{style:{flexShrink:0},children:e.jsx("img",{src:"https://media1.tenor.com/m/rcUlT6pAH9MAAAAd/jethalal-sab-changa-c.gif",alt:"Jethalal Sab Changa C",style:{width:n?"clamp(80px, 15vw, 120px)":"clamp(120px, 16vh, 160px)",height:n?"clamp(80px, 15vw, 120px)":"clamp(120px, 16vh, 160px)",borderRadius:"12px",border:"2px solid #ffd700",boxShadow:"0 4px 15px rgba(0,0,0,0.5)",objectFit:"cover"}})})]})]})]}):e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",maxWidth:"800px",margin:"0 auto",width:"100%",padding:"2rem 1rem"},children:[e.jsxs("div",{style:{background:"rgba(255, 255, 255, 0.03)",border:"1px solid rgba(255, 215, 0, 0.2)",borderRadius:"16px",padding:"3rem 2rem",textAlign:"center",width:"100%",boxShadow:"0 15px 40px rgba(0, 0, 0, 0.5)",marginBottom:"2rem"},children:[e.jsx("h1",{style:{color:"#ffd700",fontFamily:"var(--font-heading)",fontSize:"clamp(1.5rem, 4vw, 2.5rem)",margin:"0 0 1rem 0",letterSpacing:"2px",textTransform:"uppercase"},children:"Select Live Projector"}),e.jsx("p",{style:{color:"rgba(255, 255, 255, 0.6)",margin:0,fontSize:"clamp(0.9rem, 1.5vw, 1.1rem)"},children:"Choose an ongoing tournament to launch the real-time live auction projector screen."})]}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"1.5rem",width:"100%"},children:k.length===0?e.jsx("div",{style:{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"12px",padding:"3rem",gridColumn:"1 / -1",textAlign:"center"},children:e.jsx("p",{style:{color:"rgba(255,255,255,0.4)",margin:0},children:"No active tournaments found."})}):k.map(r=>e.jsxs(ge,{to:`/live-auction-projector?code=${r.auction_code}`,style:{background:"rgba(255, 255, 255, 0.03)",border:"1px solid rgba(255, 255, 255, 0.08)",borderRadius:"12px",padding:"1.5rem",textDecoration:"none",color:"inherit",display:"flex",flexDirection:"column",gap:"1rem",transition:"transform 0.2s, border-color 0.2s, box-shadow 0.2s",cursor:"pointer"},className:"projector-card-hover",onMouseEnter:i=>{i.currentTarget.style.transform="translateY(-5px)",i.currentTarget.style.borderColor="#ffd700",i.currentTarget.style.boxShadow="0 10px 20px rgba(255, 215, 0, 0.1)"},onMouseLeave:i=>{i.currentTarget.style.transform="translateY(0)",i.currentTarget.style.borderColor="rgba(255, 255, 255, 0.08)",i.currentTarget.style.boxShadow="none"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("span",{style:{padding:"0.2rem 0.6rem",borderRadius:"4px",fontSize:"0.7rem",fontWeight:"bold",textTransform:"uppercase",background:r.status==="running"?"rgba(239, 68, 68, 0.15)":r.status==="registration_open"?"rgba(57, 255, 20, 0.15)":"rgba(255,255,255,0.06)",color:r.status==="running"?"#f87171":r.status==="registration_open"?"#39ff14":"rgba(255,255,255,0.4)"},children:r.status==="running"?"🔴 Live":r.status==="registration_open"?"🟢 Open":"⚪ Ended"}),e.jsx("span",{style:{fontSize:"0.75rem",color:"#ffd700",fontWeight:"bold"},children:r.auction_code})]}),e.jsx("h3",{style:{margin:0,fontSize:"1.2rem",color:"#fff"},children:r.auction_name}),e.jsx("div",{style:{fontSize:"0.8rem",color:"rgba(255,255,255,0.6)"},children:r.venue?`📍 ${r.venue}`:""}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:"auto",color:"#39ff14",fontWeight:"bold",fontSize:"0.85rem",alignItems:"center",gap:"0.25rem"},children:"Launch Projector →"})]},r.id))})]})]}),z&&s&&e.jsxs("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"radial-gradient(circle at center, rgba(16,24,39,0.98) 0%, #050a10 100%)",zIndex:1e3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)",border:"clamp(6px, 1.5vw, 15px) solid #ffd700",overflowY:"hidden",padding:"clamp(10px, 2vh, 24px)",boxSizing:"border-box"},children:[e.jsx("div",{style:{position:"absolute",width:"100%",height:"100%",top:0,left:0,pointerEvents:"none",zIndex:1},children:[...Array(12)].map((r,i)=>e.jsx("div",{className:`fw-${i}`,style:{position:"absolute",width:6,height:6,borderRadius:"50%",opacity:0}},i))}),e.jsxs("div",{className:"sold-details-container",children:[e.jsx("div",{style:{fontSize:"clamp(1rem, 2.8vh, 2.2rem)",color:"#fff",textTransform:"uppercase",letterSpacing:"clamp(2px, 1vw, 12px)",marginBottom:"clamp(2px, 0.5vh, 8px)",position:"relative",zIndex:2,animation:"slideUp 1s ease-out",textAlign:"center"},children:"Congratulations!"}),e.jsx("div",{style:{fontSize:"clamp(2.5rem, 9vh, 6.5rem)",fontWeight:900,color:"#ffd700",textShadow:"0 0 30px rgba(255,215,0,0.5)",transform:"rotate(-3deg)",marginBottom:"clamp(8px, 1.5vh, 20px)",position:"relative",zIndex:2,animation:"bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both",textAlign:"center",width:"100%"},children:"SOLD!"}),e.jsxs("div",{style:{display:"flex",flexDirection:a?"column":"row",alignItems:"center",justifyContent:"center",gap:"clamp(16px, 3vw, 40px)",width:"100%",maxWidth:"1200px",zIndex:2,animation:"scaleUp 1s 0.3s both"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:a?"column":"row",alignItems:"center",gap:"clamp(15px, 2.5vw, 30px)",flexShrink:0},children:[e.jsx("div",{className:"cricket-anim-sold-static-container",style:{width:"clamp(180px, 25vh, 300px)",height:"clamp(180px, 25vh, 300px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsxs("svg",{width:"100%",height:"100%",viewBox:"0 0 400 400",style:{pointerEvents:"none"},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"batWood",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#d97706"}),e.jsx("stop",{offset:"50%",stopColor:"#b45309"}),e.jsx("stop",{offset:"100%",stopColor:"#78350f"})]}),e.jsxs("linearGradient",{id:"batGrip",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ffd700"}),e.jsx("stop",{offset:"100%",stopColor:"#b45309"})]}),e.jsxs("radialGradient",{id:"ballShade",cx:"30%",cy:"30%",r:"70%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ff6b6b"}),e.jsx("stop",{offset:"70%",stopColor:"#b91c1c"}),e.jsx("stop",{offset:"100%",stopColor:"#450a0a"})]})]}),e.jsx("circle",{className:"anim-shockwave",cx:"200",cy:"200",r:"1",fill:"none",stroke:"#ffd700",strokeWidth:"4"}),e.jsx("g",{className:"anim-sparks",style:{transformOrigin:"200px 200px"},children:e.jsx("path",{d:"M200,160 L200,130 M200,240 L200,270 M160,200 L130,200 M240,200 L270,200 M170,170 L150,150 M230,230 L250,250 M170,230 L150,250 M230,170 L250,150",stroke:"#ffd700",strokeWidth:"6",strokeLinecap:"round"})}),e.jsxs("g",{className:"dancing-player-body",style:{transformOrigin:"200px 220px"},children:[e.jsx("path",{d:"M 188,220 Q 175,250 170,270",fill:"none",stroke:"#1e3a8a",strokeWidth:"10",strokeLinecap:"round",className:"dancing-leg-left",style:{transformOrigin:"188px 220px"}}),e.jsx("ellipse",{cx:"166",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 212,220 Q 225,250 230,270",fill:"none",stroke:"#1e3a8a",strokeWidth:"10",strokeLinecap:"round",className:"dancing-leg-right",style:{transformOrigin:"212px 220px"}}),e.jsx("ellipse",{cx:"234",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 180,165 L 220,165 L 215,225 L 185,225 Z",fill:"#ffd700",stroke:"#ffd700",strokeWidth:"2"}),e.jsx("path",{d:"M 180,175 L 217,200 L 215,210 L 182,185 Z",fill:"#1e3a8a"}),e.jsx("text",{x:"200",y:"205",fill:"#fff",fontSize:"16",fontWeight:"bold",textAnchor:"middle",children:"7"}),e.jsx("path",{d:"M 180,175 Q 150,160 140,185",fill:"none",stroke:"#ffd700",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"138",cy:"188",r:"6",fill:"#fff"}),e.jsx("path",{d:"M 220,175 Q 250,175 260,195",fill:"none",stroke:"#ffd700",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"262",cy:"198",r:"6",fill:"#fff"}),e.jsxs("g",{className:"celebrating-bat",style:{transformOrigin:"262px 198px"},children:[e.jsx("rect",{x:"259",y:"168",width:"6",height:"30",rx:"2",fill:"url(#batGrip)"}),e.jsx("path",{d:"M 254,88 L 270,88 L 274,168 C 274,172 270,175 262,175 C 254,175 250,172 250,168 Z",fill:"url(#batWood)"}),e.jsx("rect",{x:"252",y:"110",width:"20",height:"35",fill:"#ffd700",opacity:"0.8"})]}),e.jsx("rect",{x:"195",y:"158",width:"10",height:"10",fill:"#ffedd5"}),e.jsx("circle",{cx:"200",cy:"146",r:"16",fill:"#ffedd5"}),e.jsx("circle",{cx:"194",cy:"144",r:"2",fill:"#000"}),e.jsx("circle",{cx:"206",cy:"144",r:"2",fill:"#000"}),e.jsx("path",{d:"M 193,151 Q 200,158 207,151",fill:"none",stroke:"#b91c1c",strokeWidth:"2",strokeLinecap:"round"}),e.jsx("path",{d:"M 182,142 A 18,18 0 0,1 218,142 Z",fill:"#1e3a8a"}),e.jsx("path",{d:"M 215,142 L 230,145 L 230,149 L 215,148 Z",fill:"#ffd700"})]}),e.jsxs("g",{className:"confetti-group",style:{transformOrigin:"200px 200px"},children:[e.jsx("circle",{cx:"120",cy:"150",r:"4",fill:"#ff0"}),e.jsx("circle",{cx:"280",cy:"150",r:"4",fill:"#0ff"}),e.jsx("circle",{cx:"150",cy:"100",r:"3",fill:"#f0f"}),e.jsx("circle",{cx:"250",cy:"100",r:"3",fill:"#ff0"}),e.jsx("circle",{cx:"100",cy:"220",r:"5",fill:"#39ff14"}),e.jsx("circle",{cx:"300",cy:"220",r:"5",fill:"#ff4444"})]})]})}),e.jsx("img",{src:"https://media1.tenor.com/m/Q9woRkqECoQAAAAd/strong.gif",alt:"Strong Celebration",style:{width:"clamp(220px, 30vh, 380px)",height:"auto",aspectRatio:"1.40351",borderRadius:"16px",border:"4px solid var(--accent-gold)",boxShadow:"0 0 30px rgba(255,215,0,0.4)",objectFit:"cover",flexShrink:0}})]}),e.jsxs("div",{style:{display:"flex",flexDirection:a?"column":"row",alignItems:"center",gap:a?"16px":"clamp(16px, 3vw, 40px)",textAlign:a?"center":"left",background:"rgba(255,255,255,0.05)",padding:a?"16px 12px":"clamp(12px, 2vh, 32px)",borderRadius:"clamp(12px, 2vw, 30px)",border:"2px solid rgba(255,215,0,0.4)",boxShadow:"0 25px 50px rgba(0,0,0,0.5)",maxWidth:"100%",flex:1},children:[e.jsxs("div",{style:{position:"relative"},children:[(s==null?void 0:s.player_number)!=null&&e.jsxs("div",{style:{position:"absolute",top:"-8px",left:"-8px",background:"var(--accent-gold)",color:"#000",padding:"clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)",borderRadius:"50px",fontSize:"clamp(0.7rem, 1vw, 1.1rem)",fontWeight:900,zIndex:10,boxShadow:"0 4px 12px rgba(0,0,0,0.5)",border:"2px solid #fff"},children:["#",s.player_number]}),s.players.photo_url&&!pe?e.jsx("img",{src:j(s.players.photo_url,400),alt:"Sold",onError:()=>D(!0),style:{width:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #39ff14",objectFit:"cover",boxShadow:"0 0 40px rgba(57,255,20,0.3)",flexShrink:0}}):e.jsx("div",{style:{width:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #39ff14",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, rgba(57,255,20,0.1), rgba(255,255,255,0.05))",color:"rgba(57,255,20,0.3)",fontSize:a?"clamp(1.5rem, 5vh, 2.5rem)":"clamp(2.5rem, 7vh, 4.5rem)",fontWeight:900,boxShadow:"0 0 40px rgba(57,255,20,0.3)",flexShrink:0},children:(((V=s.players.first_name)==null?void 0:V.charAt(0))||"")+(((K=s.players.last_name)==null?void 0:K.charAt(0))||"")})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"clamp(4px, 0.8vh, 12px)",minWidth:0},children:[e.jsxs("div",{style:{fontSize:a?"clamp(1.1rem, 3.8vh, 1.6rem)":"clamp(1.3rem, 4.5vh, 2.8rem)",fontWeight:"bold",color:"#fff",wordBreak:"break-word"},children:[s.players.first_name," ",s.players.last_name]}),e.jsxs("div",{style:{fontSize:a?"clamp(1.1rem, 3.8vh, 1.6rem)":"clamp(1.4rem, 4.8vh, 3.2rem)",color:"#ffd700",fontWeight:900},children:["₹ ",s.sold_price.toLocaleString()]}),e.jsxs("div",{style:{fontSize:a?"clamp(0.7rem, 2.2vh, 0.9rem)":"clamp(0.8rem, 2.5vh, 1.4rem)",color:"rgba(255,255,255,0.6)",display:"flex",flexWrap:"wrap",alignItems:"center",gap:"clamp(8px, 1.5vw, 20px)",marginBottom:"clamp(4px, 1vh, 12px)"},children:[e.jsx("span",{style:{opacity:.5},children:"Batting:"}),e.jsx("span",{children:s.players.batting_style}),e.jsx("span",{style:{opacity:.3},children:"|"}),e.jsx("span",{style:{opacity:.5},children:"Bowling:"}),e.jsx("span",{children:s.players.bowling_style})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:a?"center":"flex-start",gap:"clamp(8px, 1vw, 16px)",flexWrap:"wrap"},children:[(m==null?void 0:m.logo_url)&&e.jsx("img",{src:m.logo_url,alt:"Team",style:{width:a?"clamp(20px, 4vh, 32px)":"clamp(30px, 6vh, 50px)",height:a?"clamp(20px, 4vh, 32px)":"clamp(30px, 6vh, 50px)",objectFit:"contain"}}),e.jsx("div",{style:{fontSize:a?"clamp(1rem, 3.5vh, 1.5rem)":"clamp(1.2rem, 4vh, 2.4rem)",fontWeight:900,color:"#39ff14",wordBreak:"break-word"},children:m==null?void 0:m.team_name})]})]})]})]})]})]}),I&&l&&e.jsx("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"radial-gradient(circle at center, rgba(31,41,55,0.98) 0%, #050a10 100%)",zIndex:1e3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)",border:"clamp(6px, 1.5vw, 15px) solid #ff4444",overflowY:"hidden",padding:"clamp(10px, 2vh, 24px)",boxSizing:"border-box"},children:e.jsxs("div",{className:"unsold-details-container",children:[e.jsx("div",{style:{fontSize:"clamp(1rem, 2.8vh, 2.2rem)",color:"#fff",textTransform:"uppercase",letterSpacing:"clamp(2px, 1vw, 12px)",marginBottom:"clamp(2px, 0.5vh, 8px)",position:"relative",zIndex:2,animation:"slideUp 1s ease-out",textAlign:"center"},children:"Better Luck Next Time!"}),e.jsx("div",{style:{fontSize:"clamp(2.5rem, 9vh, 6.5rem)",fontWeight:900,color:"#ff4444",textShadow:"0 0 30px rgba(255,68,68,0.5)",transform:"rotate(-3deg)",marginBottom:"clamp(8px, 1.5vh, 20px)",position:"relative",zIndex:2,animation:"bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both",textAlign:"center",width:"100%"},children:"UNSOLD"}),e.jsxs("div",{style:{display:"flex",flexDirection:a?"column":"row",alignItems:"center",justifyContent:"center",gap:"clamp(16px, 3vw, 40px)",width:"100%",maxWidth:"1200px",zIndex:2,animation:"scaleUp 1s 0.3s both"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:a?"column":"row",alignItems:"center",gap:"clamp(15px, 2.5vw, 30px)",flexShrink:0},children:[e.jsx("div",{className:"cricket-anim-unsold-static-container",style:{width:"clamp(180px, 25vh, 300px)",height:"clamp(180px, 25vh, 300px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsxs("svg",{width:"100%",height:"100%",viewBox:"0 0 400 400",style:{pointerEvents:"none"},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"stumpWood",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#cd853f"}),e.jsx("stop",{offset:"50%",stopColor:"#8b5a2b"}),e.jsx("stop",{offset:"100%",stopColor:"#5c3a21"})]}),e.jsxs("radialGradient",{id:"redBallShade",cx:"30%",cy:"30%",r:"70%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ff4d4d"}),e.jsx("stop",{offset:"70%",stopColor:"#990000"}),e.jsx("stop",{offset:"100%",stopColor:"#3d0000"})]})]}),e.jsx("circle",{className:"anim-unsold-shockwave",cx:"200",cy:"180",r:"1",fill:"none",stroke:"#ff4444",strokeWidth:"4"}),e.jsx("g",{className:"anim-stump-left",style:{transformOrigin:"175px 260px"},children:e.jsx("rect",{x:"171",y:"160",width:"8",height:"100",rx:"3",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-stump-mid",style:{transformOrigin:"200px 260px"},children:e.jsx("rect",{x:"196",y:"160",width:"8",height:"100",rx:"3",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-stump-right",style:{transformOrigin:"225px 260px"},children:e.jsx("rect",{x:"221",y:"160",width:"8",height:"100",rx:"3",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-bail-left",style:{transformOrigin:"185px 156px"},children:e.jsx("rect",{x:"170",y:"154",width:"28",height:"6",rx:"2",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-bail-right",style:{transformOrigin:"215px 156px"},children:e.jsx("rect",{x:"202",y:"154",width:"28",height:"6",rx:"2",fill:"url(#stumpWood)"})}),e.jsxs("g",{className:"anim-unsold-ball",children:[e.jsx("circle",{cx:"0",cy:"0",r:"14",fill:"url(#redBallShade)"}),e.jsx("path",{d:"M -14,0 A 14,14 0 0,0 14,0",fill:"none",stroke:"#fff",strokeWidth:"1.5",strokeDasharray:"2,2"})]}),e.jsxs("g",{className:"sad-cricketer-walk",style:{transformOrigin:"200px 220px"},children:[e.jsx("path",{d:"M 188,220 Q 175,250 170,270",fill:"none",stroke:"#475569",strokeWidth:"10",strokeLinecap:"round",className:"sad-leg-left",style:{transformOrigin:"188px 220px"}}),e.jsx("ellipse",{cx:"166",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 212,220 Q 225,250 230,270",fill:"none",stroke:"#475569",strokeWidth:"10",strokeLinecap:"round",className:"sad-leg-right",style:{transformOrigin:"212px 220px"}}),e.jsx("ellipse",{cx:"234",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 180,165 L 220,165 L 215,225 L 185,225 Z",fill:"#64748b",stroke:"#64748b",strokeWidth:"2"}),e.jsx("path",{d:"M 180,175 L 217,200 L 215,210 L 182,185 Z",fill:"#334155"}),e.jsx("text",{x:"200",y:"205",fill:"#fff",fontSize:"16",fontWeight:"bold",textAnchor:"middle",children:"0"}),e.jsx("path",{d:"M 180,175 Q 165,155 180,148",fill:"none",stroke:"#64748b",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"180",cy:"148",r:"6",fill:"#fff"}),e.jsx("path",{d:"M 220,175 Q 235,210 240,220",fill:"none",stroke:"#64748b",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"240",cy:"220",r:"6",fill:"#fff"}),e.jsxs("g",{style:{transformOrigin:"240px 220px",transform:"rotate(25deg)"},children:[e.jsx("rect",{x:"237",y:"190",width:"6",height:"30",rx:"2",fill:"url(#batGrip)"}),e.jsx("path",{d:"M 232,220 L 248,220 L 252,295 C 252,299 248,302 240,302 C 232,302 228,299 228,295 Z",fill:"url(#batWood)"})]}),e.jsx("rect",{x:"195",y:"158",width:"10",height:"10",fill:"#ffedd5"}),e.jsx("circle",{cx:"200",cy:"146",r:"16",fill:"#ffedd5"}),e.jsx("path",{d:"M 192,143 Q 195,145 198,143",fill:"none",stroke:"#000",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("path",{d:"M 202,143 Q 205,145 208,143",fill:"none",stroke:"#000",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("path",{d:"M 193,154 Q 200,148 207,154",fill:"none",stroke:"#b91c1c",strokeWidth:"2.5",strokeLinecap:"round"}),e.jsx("path",{d:"M 194,146 L 194,158",fill:"none",stroke:"#3b82f6",strokeWidth:"2.5",strokeLinecap:"round",strokeDasharray:"3,3",strokeDashoffset:"0",className:"sad-tears"}),e.jsx("path",{d:"M 206,146 L 206,158",fill:"none",stroke:"#3b82f6",strokeWidth:"2.5",strokeLinecap:"round",strokeDasharray:"3,3",strokeDashoffset:"0",className:"sad-tears"}),e.jsx("path",{d:"M 182,142 A 18,18 0 0,1 218,142 Z",fill:"#334155"}),e.jsx("path",{d:"M 215,142 L 230,145 L 230,149 L 215,148 Z",fill:"#94a3b8"})]})]})}),e.jsx("img",{src:"https://media1.tenor.com/m/FqCZEtnZp10AAAAd/jethalal-jethalal-face-expression.gif",alt:"Jethalal Sad Expression",style:{width:"clamp(180px, 25vh, 300px)",height:"auto",aspectRatio:"1",borderRadius:"16px",border:"4px solid #ff4444",boxShadow:"0 0 30px rgba(255,68,68,0.4)",objectFit:"cover",flexShrink:0}})]}),e.jsxs("div",{style:{display:"flex",flexDirection:a?"column":"row",alignItems:"center",gap:a?"16px":"clamp(16px, 3vw, 40px)",textAlign:a?"center":"left",background:"rgba(255,255,255,0.05)",padding:a?"16px 12px":"clamp(12px, 2vh, 32px)",borderRadius:"clamp(12px, 2vw, 30px)",border:"2px solid rgba(255,68,68,0.4)",boxShadow:"0 25px 50px rgba(0,0,0,0.5)",maxWidth:"100%",flex:1},children:[e.jsxs("div",{style:{position:"relative"},children:[(l==null?void 0:l.player_number)!=null&&e.jsxs("div",{style:{position:"absolute",top:"-8px",left:"-8px",background:"#ff4444",color:"#fff",padding:"clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)",borderRadius:"50px",fontSize:"clamp(0.7rem, 1vw, 1.1rem)",fontWeight:900,zIndex:10,boxShadow:"0 4px 12px rgba(0,0,0,0.5)",border:"2px solid #fff"},children:["#",l.player_number]}),l.players.photo_url&&!de?e.jsx("img",{src:j(l.players.photo_url,400),alt:"Unsold",onError:()=>A(!0),style:{width:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #94a3b8",objectFit:"cover",boxShadow:"0 0 40px rgba(148,163,184,0.2)",flexShrink:0,filter:"grayscale(0.5)"}}):e.jsx("div",{style:{width:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:a?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #94a3b8",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, rgba(255,68,68,0.1), rgba(255,255,255,0.05))",color:"rgba(255,68,68,0.3)",fontSize:a?"clamp(1.5rem, 5vh, 2.5rem)":"clamp(2.5rem, 7vh, 4.5rem)",fontWeight:900,boxShadow:"0 0 40px rgba(255,68,68,0.1)",flexShrink:0},children:(((X=l.players.first_name)==null?void 0:X.charAt(0))||"")+(((P=l.players.last_name)==null?void 0:P.charAt(0))||"")})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"clamp(4px, 0.8vh, 12px)",minWidth:0},children:[e.jsxs("div",{style:{fontSize:a?"clamp(1.2rem, 4vh, 1.8rem)":"clamp(1.4rem, 4.5vh, 2.8rem)",fontWeight:"bold",color:"#fff",wordBreak:"break-word"},children:[l.players.first_name," ",l.players.last_name]}),e.jsxs("div",{style:{fontSize:a?"clamp(0.8rem, 2.5vh, 1rem)":"clamp(0.9rem, 2.8vh, 1.5rem)",color:"rgba(255,255,255,0.7)",display:"flex",flexWrap:"wrap",alignItems:"center",gap:"clamp(10px, 2vw, 30px)"},children:[e.jsx("span",{style:{background:"rgba(255,255,255,0.1)",padding:"4px 12px",borderRadius:"4px"},children:l.players.player_role}),e.jsx("span",{style:{opacity:.5},children:"|"}),e.jsxs("span",{style:{color:"#ff4444"},children:["BASE: ₹ ",(ee=p==null?void 0:p.base_price)==null?void 0:ee.toLocaleString()]})]}),e.jsx("div",{style:{fontSize:a?"clamp(0.7rem, 2.2vh, 0.9rem)":"clamp(0.8rem, 2.5vh, 1.2rem)",color:"rgba(255,255,255,0.5)",fontStyle:"italic",marginTop:"10px"},children:"This player may come back for accelerated auction."})]})]})]})]})}),e.jsx("style",{children:`
                @keyframes pulse {
                    0%   { transform: scale(1); opacity: 1; }
                    50%  { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes flash {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.3; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(1.05); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes explode {
                    0%   { transform: scale(1); opacity: 1; }
                    100% { transform: scale(30); opacity: 0; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
                @keyframes goldGlowPulse {
                    0%, 100% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); }
                    50%      { box-shadow: 0 0 45px rgba(255, 215, 0, 0.45); border-color: rgba(255, 215, 0, 0.9); }
                }
                @keyframes bounceIn {
                    0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                    50%  { transform: scale(1.1) rotate(20deg); opacity: 1; }
                    70%  { transform: scale(0.9) rotate(-5deg); }
                    100% { transform: scale(1) rotate(-3deg); }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to   { transform: scale(1); opacity: 1; }
                }
                .fw-0  { top: 20%; left: 20%; background: #ff0;    animation: explode 2.0s infinite; }
                .fw-1  { top: 70%; left: 10%; background: #f0f;    animation: explode 2.5s infinite 0.5s; }
                .fw-2  { top: 10%; left: 80%; background: #0ff;    animation: explode 2.2s infinite 1.0s; }
                .fw-3  { top: 80%; left: 85%; background: #39ff14; animation: explode 2.8s infinite 0.2s; }
                .fw-4  { top: 40%; left: 50%; background: #ff4444; animation: explode 2.4s infinite 0.7s; }
                .fw-5  { top: 15%; left: 45%; background: #fff;    animation: explode 2.1s infinite 1.2s; }
                .fw-6  { top: 85%; left: 30%; background: #ffd700; animation: explode 2.6s infinite 0.8s; }
                .fw-7  { top: 50%; left: 15%; background: #007bff; animation: explode 2.3s infinite 0.4s; }
                .fw-8  { top: 30%; left: 75%; background: #ff8c00; animation: explode 2.7s infinite 0.9s; }
                .fw-9  { top: 60%; left: 90%; background: #9400d3; animation: explode 2.5s infinite 0.1s; }
                .fw-10 { top:  5%; left:  5%; background: #adff2f; animation: explode 2.9s infinite 1.1s; }
                .fw-11 { top: 90%; left: 60%; background: #00ffff; animation: explode 2.4s infinite 0.6s; }

                /* Cricket SOLD cinematic animations */
                .cricket-anim-sold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                @keyframes fadeIntroCinematic {
                    0% { opacity: 1; visibility: visible; }
                    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); visibility: hidden; }
                }

                /* Dancing player animations */
                .dancing-player-body {
                    animation: playerDance 0.8s ease-in-out infinite alternate;
                }

                @keyframes playerDance {
                    0% { transform: translateY(10px) scale(0.98) rotate(-3deg); }
                    100% { transform: translateY(-15px) scale(1.02) rotate(3deg); }
                }

                .celebrating-bat {
                    animation: spinBat 0.6s linear infinite;
                }

                @keyframes spinBat {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .dancing-leg-left {
                    animation: legDanceLeft 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceLeft {
                    0% { transform: rotate(-10deg); }
                    100% { transform: rotate(15deg); }
                }

                .dancing-leg-right {
                    animation: legDanceRight 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceRight {
                    0% { transform: rotate(10deg); }
                    100% { transform: rotate(-15deg); }
                }

                .confetti-group {
                    animation: confettiExplode 2.0s ease-out infinite;
                }

                @keyframes confettiExplode {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1.6); opacity: 0; }
                }

                .anim-bat-group {
                    animation: batSwing 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes batSwing {
                    0% { transform: rotate(-85deg); }
                    /* Contact point around 27% of 1.8s (approx 0.5s) */
                    27% { transform: rotate(5deg); }
                    40% { transform: rotate(15deg); }
                    70% { transform: rotate(45deg); opacity: 1; }
                    100% { transform: rotate(60deg); opacity: 0; }
                }

                .anim-ball-group {
                    animation: ballFlightSold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightSold {
                    0% { transform: translate(-150px, 320px) scale(1.4); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 200px) scale(1); }
                    /* Flies high and away to top right */
                    60% { transform: translate(450px, -150px) scale(0.5); }
                    100% { transform: translate(600px, -300px) scale(0.2); opacity: 0; }
                }

                .anim-shockwave {
                    animation: glowShockwave 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwave {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(6); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(6); opacity: 0; }
                }

                .anim-sparks {
                    animation: sparkBurst 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes sparkBurst {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0.5); opacity: 1; }
                    60% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1.8); opacity: 0; }
                }

                /* Cricket UNSOLD cinematic animations */
                .cricket-anim-unsold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                .anim-unsold-ball {
                    animation: ballFlightUnsold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightUnsold {
                    0% { transform: translate(50px, -150px) scale(1.6); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 175px) scale(1); }
                    /* Deflects down and right */
                    60% { transform: translate(260px, 280px) scale(0.8); }
                    100% { transform: translate(300px, 350px) scale(0.6); opacity: 0; }
                }

                .anim-unsold-shockwave {
                    animation: glowShockwaveUnsold 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwaveUnsold {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(5); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(5); opacity: 0; }
                }

                .anim-stump-left {
                    animation: stumpShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-55deg) translate(-100px, 20px); opacity: 0.8; }
                }

                .anim-stump-mid {
                    animation: stumpShatterMid 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterMid {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(15deg) translate(20px, 80px); opacity: 0.8; }
                }

                .anim-stump-right {
                    animation: stumpShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(65deg) translate(120px, 10px); opacity: 0.8; }
                }

                .anim-bail-left {
                    animation: bailShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes bailShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-280deg) translate(-120px, -180px); opacity: 0.5; }
                }

                .anim-bail-right {
                    animation: bailShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                /* Sad cricketer crying animations in place next to stumps */
                .sad-cricketer-walk {
                    animation: sadBob 0.6s ease-in-out infinite alternate;
                    opacity: 1;
                }

                @keyframes sadBob {
                    0% { transform: translate(90px, 10px) scale(0.85) translateY(0); }
                    100% { transform: translate(90px, 10px) scale(0.85) translateY(8px); }
                }

                .sad-leg-left {
                    /* Stand still */
                }

                .sad-leg-right {
                    /* Stand still */
                }

                .sad-tears {
                    animation: dripTears 0.4s linear infinite;
                }

                @keyframes dripTears {
                    0% { stroke-dashoffset: 0; opacity: 0.3; }
                    50% { opacity: 1; }
                    100% { stroke-dashoffset: 8; opacity: 0.2; }
                }

                @keyframes bailShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(320deg) translate(140px, -200px); opacity: 0.5; }
                }

                /* Fading in details container instantly with the overlay */
                .sold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                .unsold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                @keyframes cardFadeInFromBelow {
                    from {
                        opacity: 0;
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `})]})};export{je as default};
