/* A small offline TeX-to-MathML renderer for the course's equation subset. */
(() => {
  'use strict';
  const symbols = {
    alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', theta:'θ', lambda:'λ', mu:'μ', nu:'ν', pi:'π', rho:'ρ', sigma:'σ', phi:'φ', varphi:'ϕ', omega:'ω',
    Gamma:'Γ', Delta:'Δ', Lambda:'Λ', Omega:'Ω', Sigma:'Σ', Phi:'Φ', varepsilon:'ϵ', partial:'∂', nabla:'∇', infty:'∞', cdot:'·', times:'×', pm:'±',
    le:'≤', leq:'≤', ge:'≥', geq:'≥', neq:'≠', approx:'≈', equiv:'≡', to:'→', rightarrow:'→', leftarrow:'←', mapsto:'↦', perp:'⊥', parallel:'∥', angle:'∠',
    ell:'ℓ', hbar:'ℏ', langle:'⟨', rangle:'⟩', quad:'\u00a0\u00a0', qquad:'\u00a0\u00a0\u00a0\u00a0',
    sin:'sin', cos:'cos', tan:'tan', cot:'cot', ln:'ln', log:'log', exp:'exp', max:'max', min:'min', sum:'∑', prod:'∏', int:'∫', text:'text', mathrm:'mathrm', operatorname:'operatorname',
    vec:'vec', overline:'overline', bar:'bar', hat:'hat', cancel:'cancel',
  };
  const op = s => `<mo>${s}</mo>`;
  const mi = (s, normal=false) => `<mi${normal?' mathvariant="normal"':''}>${s}</mi>`;
  const mn = s => `<mn>${s}</mn>`;
  const mrow = s => `<mrow>${s}</mrow>`;
  const readGroup = (source, pos) => {
    while (/\s/.test(source[pos] || '') && pos < source.length) pos++;
    if (source[pos] !== '{') return readAtom(source, pos);
    const inner = parse(source, pos + 1, true);
    return { node:mrow(inner.body), pos:inner.pos };
  };
  function readAtom(source, pos) {
    if (pos >= source.length) return {node:'',pos};
    const c=source[pos];
    if (c === '{') return readGroup(source,pos);
    if (c === '\\') {
      const match=source.slice(pos+1).match(/^[A-Za-z]+|^./);
      if (!match) return {node:'',pos:pos+1};
      const command=match[0]; let next=pos+1+command.length;
      if (command === 'frac' || command === 'dfrac' || command === 'tfrac') {
        const a=readGroup(source,next), b=readGroup(source,a.pos);
        return {node:`<mfrac>${a.node}${b.node}</mfrac>`,pos:b.pos};
      }
      if (command === 'sqrt') {
        const a=readGroup(source,next);
        return {node:`<msqrt>${a.node}</msqrt>`,pos:a.pos};
      }
      if (['text','mathrm','mathbf','mathit','mathcal','mathbb','operatorname'].includes(command)) {
        const a=readGroup(source,next);const raw=a.node.replace(/<[^>]*>/g,'');
        const variant={mathcal:'script',mathbb:'double-struck',mathbf:'bold',mathit:'italic'}[command];
        const body=command==='text'?`<mtext>${raw}</mtext>`:[...raw].map(ch=>/[0-9]/.test(ch)?mn(ch):`<mi${variant?` mathvariant="${variant}"`:command==='mathrm'||command==='operatorname'?' mathvariant="normal"':''}>${ch}</mi>`).join('');
        return {node:mrow(body),pos:a.pos};
      }
      if (['vec','overline','bar','hat','cancel'].includes(command)) {
        const a=readGroup(source,next), tag={vec:'mover',overline:'mover',bar:'mover',hat:'mover',cancel:'menclose'}[command];
        if(command==='cancel')return {node:`<menclose notation="updiagonalstrike">${a.node}</menclose>`,pos:a.pos};
        const mark=command==='vec'?'→':command==='hat'?'^':'¯';
        return {node:`<mover>${a.node}<mo>${mark}</mo></mover>`,pos:a.pos};
      }
      if(command==='left'||command==='right'||command==='displaystyle'||command==='textstyle'||command==='limits'||command==='nolimits')return {node:'',pos:next};
      if(command===','||command===';'||command===':'||command==='!')return {node:command==='!'?'':`<mspace width="0.18em"/>`,pos:next};
      if(Object.prototype.hasOwnProperty.call(symbols,command)) {
        const value=symbols[command];
        const fn=['sin','cos','tan','cot','ln','log','exp','max','min'].includes(command),greek=['alpha','beta','gamma','delta','epsilon','theta','lambda','mu','nu','pi','rho','sigma','phi','varphi','omega','Gamma','Delta','Lambda','Omega','Sigma','Phi'].includes(command);
        return {node:fn?mi(value,true):greek?mi(value):op(value),pos:next};
      }
      return {node:mi(command),pos:next};
    }
    if(c === '\\,' || c === '\\;' || c === '\\!')return {node:'<mspace width="0.18em"/>',pos:pos+2};
    if(/[0-9]/.test(c)) {
      let end=pos+1;while(end<source.length&&/[0-9.,]/.test(source[end]))end++;
      return {node:mn(source.slice(pos,end).replace(',', '.')),pos:end};
    }
    if(/[A-Za-z]/.test(c)) {
      let end=pos+1;while(end<source.length&&/[A-Za-z]/.test(source[end]))end++;
      const word=source.slice(pos,end);return {node:word.length>1?mi(word,true):mi(word),pos:end};
    }
    const mapped={'−':'−','×':'×','·':'·','≤':'≤','≥':'≥','≠':'≠','≈':'≈','→':'→','←':'←','∞':'∞','∑':'∑','∫':'∫','±':'±','∥':'∥','⊥':'⊥'}[c]||c;
    return {node:op(mapped),pos:pos+1};
  }
  function parse(source, pos=0, group=false) {
    const parts=[];
    while(pos<source.length) {
      if(source[pos]==='}') {if(group)return {body:parts.join(''),pos:pos+1};pos++;continue;}
      if(/\s/.test(source[pos])) {pos++;continue;}
      if(source[pos]==='^'||source[pos]==='_') {
        const kind=source[pos++],arg=readGroup(source,pos);pos=arg.pos;
        if(!parts.length){parts.push(kind==='^'?`<msup><mi></mi>${arg.node}</msup>`:`<msub><mi></mi>${arg.node}</msub>`);continue;}
        const previous=parts.pop();
        let sub='',sup='';
        if(previous.startsWith('<msub>')){const a=previous.match(/^<msub>([\s\S]*)<\/msub>$/);const close=a?.[1].lastIndexOf('</mrow>');if(a)sub=a[1];}
        if(previous.startsWith('<msup>')){const a=previous.match(/^<msup>([\s\S]*)<\/msup>$/);if(a)sup=a[1];}
        let base=previous;if(sub||sup){const tag=sub&&sup?'msubsup':sub?'msub':'msup';const extras=sub&&sup?`${sub}${sup}`:sub||sup;base=`<${tag}>${previous.replace(/^<m(?:sub|sup)>/,'').replace(/<\/m(?:sub|sup)>$/,'')}${extras}</${tag}>`;}
        if(kind==='^')sup=arg.node;else sub=arg.node;
        const tag=sub&&sup?'msubsup':sub?'msub':'msup';
        const core=base.replace(/^<m(?:sub|sup|subsup)>/,'').replace(/<\/m(?:sub|sup|subsup)>$/,'');
        parts.push(`<${tag}>${core}${sub}${sup}</${tag}>`);continue;
      }
      const a=readAtom(source,pos);pos=a.pos;
      if(!a.node)continue;
      let sub='',sup='',check=pos;
      for(let i=0;i<2;i++){
        while(/\s/.test(source[check]||'')&&check<source.length)check++;
        const kind=source[check];if(kind!=='^'&&kind!=='_')break;
        check++;const arg=readGroup(source,check);check=arg.pos;if(kind==='^')sup=arg.node;else sub=arg.node;
      }
      pos=check;
      const tag=sub&&sup?'msubsup':sub?'msub':sup?'msup':'';
      parts.push(tag?`<${tag}>${a.node}${sub}${sup}</${tag}>`:a.node);
    }
    return {body:parts.join(''),pos};
  }
  function render(tex, display=false) {
    const source=String(tex||'');
    const mathml=parse(source).body;
    return `<math class="math-render" xmlns="http://www.w3.org/1998/Math/MathML"${display?' display="block"':''} aria-label="${source.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}"><mrow>${mathml}</mrow></math>`;
  }
  window.PhysicsMath={render};
})();

