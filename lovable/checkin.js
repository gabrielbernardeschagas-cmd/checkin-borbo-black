// ===== CONFIG =====
const FUNCAO = "https://uzsbtzfmctrhgsmjugkm.supabase.co/functions/v1/checkin-borbo";
const GRUPO_URL = "";            // link do grupo de alunas (WhatsApp) — vazio = botão desativado
const MARCAR = "@clubedaborboleta"; // handle que aparece no post (ajustar)
// ==================

const $ = s => document.querySelector(s);
const btnGrupo = $("#btnGrupo");
if (GRUPO_URL) btnGrupo.href = GRUPO_URL; else { btnGrupo.setAttribute("disabled",""); btnGrupo.style.opacity=".45"; btnGrupo.addEventListener("click",e=>e.preventDefault()); }

document.querySelectorAll("[data-abrir]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();$("#modal").classList.add("aberto");document.body.style.overflow="hidden";}));
document.querySelectorAll("[data-fechar]").forEach(b=>b.addEventListener("click",()=>{$("#modal").classList.remove("aberto");document.body.style.overflow="";}));

// máscara de WhatsApp
$("#whatsapp").addEventListener("input",e=>{let d=e.target.value.replace(/\D/g,"").slice(0,11);let s=d;if(d.length>2)s="("+d.slice(0,2)+") "+d.slice(2);if(d.length>7)s="("+d.slice(0,2)+") "+d.slice(2,7)+"-"+d.slice(7);e.target.value=s;});

// foto: recorta em quadrado 900px antes de enviar
let fotoBlob=null, fotoImg=null;
$("#foto").addEventListener("change",async e=>{
  const f=e.target.files[0]; if(!f) return;
  const img=await carregarImagem(URL.createObjectURL(f));
  const c=document.createElement("canvas"); c.width=c.height=900;
  const s=Math.min(img.width,img.height); const sx=(img.width-s)/2, sy=(img.height-s)/2;
  c.getContext("2d").drawImage(img,sx,sy,s,s,0,0,900,900);
  fotoBlob=await new Promise(r=>c.toBlob(r,"image/jpeg",.88));
  fotoImg=img; $("#prev").src=c.toDataURL("image/jpeg",.7);
});
function carregarImagem(src){return new Promise((ok,err)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=err;i.src=src;});}

// envio
$("#form").addEventListener("submit",async e=>{
  e.preventDefault(); const erro=$("#erro"); erro.textContent="";
  const nome=$("#nome").value.trim(), email=$("#email").value.trim(), wa=$("#whatsapp").value, ig=$("#instagram").value.trim();
  if(!fotoBlob) return erro.textContent="Escolha uma foto sua.";
  if(nome.length<3) return erro.textContent="Informe seu nome.";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro.textContent="E-mail inválido.";
  if(wa.replace(/\D/g,"").length<10) return erro.textContent="WhatsApp incompleto.";
  if(!ig) return erro.textContent="Informe seu Instagram.";
  if(!$("#confirmou").checked) return erro.textContent="Confirme sua presença no dia 05/11 às 20h.";
  const fd=new FormData(); fd.append("nome",nome); fd.append("email",email); fd.append("whatsapp",wa); fd.append("instagram",ig); fd.append("confirmou","1");
  fd.append("foto",fotoBlob,"foto.jpg"); fd.append("utm",JSON.stringify(Object.fromEntries(new URLSearchParams(location.search))));
  const btn=$("#enviar"); btn.disabled=true; btn.textContent="Gerando...";
  try{
    const r=await fetch(FUNCAO,{method:"POST",body:fd}); const j=await r.json();
    if(!r.ok||j.erro) throw new Error(j.erro||"Falha ao enviar.");
    await mostrarResultado(j);
  }catch(ex){ erro.textContent=ex.message; }
  finally{ btn.disabled=false; btn.textContent="Gerar meu número da sorte"; }
});

let postBlob=null;
async function mostrarResultado(j){
  $("#form").style.display="none"; $("#res").classList.add("aberto");
  $("#resNumero").textContent=String(j.numero_sorte);
  if(j.ja_existe){ $("#resTitulo").textContent="Você já fez check-in"; $("#resSub").textContent="Seu número da sorte continua o mesmo:"; }
  const img = fotoImg && !j.ja_existe ? fotoImg : await carregarImagem(j.foto_url);
  await desenharPost($("#post"), {nome:j.nome, numero:j.numero_sorte, foto:img, instagram:j.instagram});
  postBlob=await new Promise(r=>$("#post").toBlob(r,"image/png"));
  const arquivo=new File([postBlob],"check-in-borbo-black.png",{type:"image/png"});
  if(navigator.canShare && navigator.canShare({files:[arquivo]})){ const b=$("#compartilhar"); b.style.display="block"; b.onclick=()=>navigator.share({files:[arquivo],title:"Check-in VIP Borbô Black"}).catch(()=>{}); }
  $("#baixar").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(postBlob);a.download="check-in-borbo-black.png";a.click();};
  try{ if(window.fbq) fbq("track","CompleteRegistration"); }catch(_){}
}

// ===== DESENHO DO POST (1080x1350) =====
const LARANJA="#fd8222";
let logoImg=null;
async function desenharPost(canvas,{nome,numero,foto,instagram}){
  await document.fonts.load('80px "Archivo Black"'); await document.fonts.load('800 40px Outfit');
  if(!logoImg) logoImg=await carregarImagem("https://uzsbtzfmctrhgsmjugkm.supabase.co/storage/v1/object/public/borbo-checkin/assets/logo.png");
  const c=canvas.getContext("2d"), W=1080, H=1350;
  c.fillStyle="#000"; c.fillRect(0,0,W,H);
  // brilho laranja sutil
  const g=c.createRadialGradient(W/2,560,50,W/2,560,620); g.addColorStop(0,"rgba(253,130,34,.22)"); g.addColorStop(1,"rgba(0,0,0,0)"); c.fillStyle=g; c.fillRect(0,0,W,H);
  // logo
  const lw=460, lh=lw*logoImg.height/logoImg.width; c.drawImage(logoImg,(W-lw)/2,54,lw,lh);
  // selo
  selo(c, W/2, 54+lh+34, "EU VOU  ·  CHECK-IN VIP");
  // foto circular com anel
  const cy=600, r=210;
  c.save(); c.beginPath(); c.arc(W/2,cy,r+12,0,Math.PI*2); c.fillStyle=LARANJA; c.fill(); c.restore();
  c.save(); c.beginPath(); c.arc(W/2,cy,r,0,Math.PI*2); c.clip();
  const s=Math.min(foto.width,foto.height); c.drawImage(foto,(foto.width-s)/2,(foto.height-s)/2,s,s,W/2-r,cy-r,r*2,r*2); c.restore();
  // nome
  c.textAlign="center"; c.fillStyle="#fff";
  const nomeUp=nome.toUpperCase(); let fs=64; c.font=`${fs}px "Archivo Black"`;
  while(c.measureText(nomeUp).width>W-140 && fs>34){fs-=3;c.font=`${fs}px "Archivo Black"`;}
  c.fillText(nomeUp,W/2,cy+r+96);
  if(instagram){ c.font='600 30px Outfit'; c.fillStyle=LARANJA; c.fillText("@"+instagram,W/2,cy+r+140); }
  // confirmada
  c.fillStyle="#fff"; c.font='800 34px Outfit'; c.fillText("ALUNA CONFIRMADA",W/2,cy+r+215);
  c.fillStyle="#cfcfcf"; c.font='400 30px Outfit'; c.fillText("na Black das Alunas do Clube da Borboleta",W/2,cy+r+258);
  // bloco data + número
  const by=cy+r+296, bh=170; arred(c,90,by,W-180,bh,22,LARANJA);
  c.fillStyle="#000"; c.textAlign="left";
  c.font='78px "Archivo Black"'; c.fillText("05/11",128,by+110);
  c.font='800 28px Outfit'; c.fillText("ÀS 20H · AO VIVO",372,by+74);
  c.font='600 25px Outfit'; c.fillText("Número da sorte",372,by+114);
  c.textAlign="right"; c.font='92px "Archivo Black"'; c.fillText(String(numero),W-128,by+120);
  // rodapé (abaixo do bloco, sem sobrepor)
  c.textAlign="center"; c.fillStyle="#fff"; c.font='600 30px Outfit'; c.fillText("Concorrendo a um iPhone novinho 🍀",W/2,by+bh+58);
}
function selo(c,x,y,txt){c.font='800 26px Outfit';const w=c.measureText(txt).width+64;arred(c,x-w/2,y,w,56,28,LARANJA);c.fillStyle="#000";c.textAlign="center";c.fillText(txt,x,y+38);}
function arred(c,x,y,w,h,r,cor){c.fillStyle=cor;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}

// mockup da seção 2 (exemplo)
(async()=>{try{
  const ex=await carregarImagem("https://uzsbtzfmctrhgsmjugkm.supabase.co/storage/v1/object/public/borbo-checkin/assets/fabiola-nina.jpg");
  await desenharPost($("#mock"),{nome:"Seu nome aqui",numero:"7431",foto:ex,instagram:"seuperfil"});
}catch(e){console.warn(e)}})();
