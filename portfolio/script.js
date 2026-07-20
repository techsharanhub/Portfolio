/* ============================================================
   NEURAL CONSTELLATION — persistent WebGL background
   ============================================================ */
(function initScene(){
  const canvas = document.getElementById('scene');
  if (!window.THREE || !canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 40);

  // ---- node field ----
  const NODE_COUNT = window.innerWidth < 768 ? 100 : 240;
  const RADIUS = 55;
  const nodePositions = [];
  const nodeGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(NODE_COUNT * 3);

  for (let i = 0; i < NODE_COUNT; i++){
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * RADIUS * 2,
      (Math.random() - 0.5) * RADIUS * 2,
      (Math.random() - 0.5) * RADIUS * 2.4
    );
    nodePositions.push(v);
    positions[i*3] = v.x;
    positions[i*3+1] = v.y;
    positions[i*3+2] = v.z;
  }
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const nodeMat = new THREE.PointsMaterial({
    color: 0x7c5cff,
    size: 0.6,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true
  });
  const points = new THREE.Points(nodeGeo, nodeMat);
  scene.add(points);

  // ---- synapse lines: connect nearby nodes ----
  const lineVerts = [];
  const MAX_DIST = 9;
  for (let i = 0; i < nodePositions.length; i++){
    for (let j = i+1; j < nodePositions.length; j++){
      if (nodePositions[i].distanceTo(nodePositions[j]) < MAX_DIST){
        lineVerts.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
        lineVerts.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineVerts), 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x2de2e6, transparent:true, opacity:0.14 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // ---- a slow-rotating wireframe "strategic core" — icosahedron in icosahedron ----
  const coreOuterGeo = new THREE.IcosahedronGeometry(10, 1);
  const coreOuterMat = new THREE.MeshBasicMaterial({ color: 0x7c5cff, wireframe:true, transparent:true, opacity:0.18 });
  const coreOuter = new THREE.Mesh(coreOuterGeo, coreOuterMat);
  coreOuter.position.set(0, 0, -10);
  scene.add(coreOuter);

  const coreInnerGeo = new THREE.OctahedronGeometry(5.5, 0);
  const coreInnerMat = new THREE.MeshBasicMaterial({ color: 0x2de2e6, wireframe:true, transparent:true, opacity:0.28 });
  const coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
  coreInner.position.set(0, 0, -10);
  scene.add(coreInner);

  scene.fog = new THREE.FogExp2(0x05060b, 0.012);

  // ---- interaction state ----
  let mouseX = 0, mouseY = 0;
  let targetRotX = 0, targetRotY = 0;
  let scrollProgress = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  }, { passive:true });

  function updateScrollProgress(){
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = (scrollProgress * 100) + '%';
  }
  window.addEventListener('scroll', updateScrollProgress, { passive:true });
  updateScrollProgress();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!reduceMotion){
      points.rotation.y = t * 0.02;
      lines.rotation.y = t * 0.02;
      points.rotation.x = t * 0.008;
      lines.rotation.x = t * 0.008;

      coreOuter.rotation.y = t * 0.15;
      coreOuter.rotation.x = t * 0.08;
      coreInner.rotation.y = -t * 0.22;
      coreInner.rotation.x = t * 0.12;

      targetRotY += (mouseX * 0.4 - targetRotY) * 0.03;
      targetRotX += (mouseY * 0.3 - targetRotX) * 0.03;
      scene.rotation.y += (targetRotY - scene.rotation.y) * 0.06;
      scene.rotation.x += (-targetRotX - scene.rotation.x) * 0.06;

      const targetZ = 40 - scrollProgress * 55;
      camera.position.z += (targetZ - camera.position.z) * 0.05;

      const pulse = 0.8 + Math.sin(t * 0.6) * 0.1;
      nodeMat.opacity = pulse;
    }

    renderer.render(scene, camera);
  }
  animate();
})();

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
(function initCursor(){
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let rx = mx, ry = my;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
  }, { passive:true });

  function loop(){
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  }
  loop();

  const hoverables = document.querySelectorAll('a, button, .tilt-card, .magnetic');
  hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });
})();

/* ============================================================
   MAGNETIC BUTTONS
   ============================================================ */
(function initMagnetic(){
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  const els = document.querySelectorAll('.magnetic');
  els.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width/2;
      const y = e.clientY - rect.top - rect.height/2;
      el.style.transform = `translate(${x*0.25}px, ${y*0.35}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
  });
})();

/* ============================================================
   SCROLL REVEALS
   ============================================================ */
(function initReveals(){
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)){
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold:0.15, rootMargin:'0px 0px -8% 0px' });

  targets.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 5) * 60}ms`;
    io.observe(el);
  });
})();

/* ============================================================
   COUNT-UP STATS
   ============================================================ */
(function initCountUp(){
  const nums = document.querySelectorAll('.stat .num');
  if (!nums.length || !('IntersectionObserver' in window)) return;

  function animateNum(el){
    const target = parseFloat(el.dataset.count);
    const isDecimal = String(target).includes('.');
    const duration = 1400;
    const start = performance.now();

    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = isDecimal ? value.toFixed(2) : Math.round(value);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = isDecimal ? target.toFixed(2) : target;
    }
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        animateNum(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold:0.5 });

  nums.forEach(el => io.observe(el));
})();

/* ============================================================
   ORBIT NAV — active section tracking
   ============================================================ */
(function initNav(){
  const navLinks = document.querySelectorAll('.orbit-nav a');
  const sections = Array.from(navLinks).map(a => document.querySelector(a.getAttribute('href')));

  function onScroll(){
    const y = window.scrollY + window.innerHeight * 0.4;
    let activeIdx = 0;
    sections.forEach((sec, i) => {
      if (sec && sec.offsetTop <= y) activeIdx = i;
    });
    navLinks.forEach((a, i) => a.classList.toggle('active', i === activeIdx));
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
})();

/* ============================================================
   TILT CARDS — 3D CSS tilt following the cursor
   ============================================================ */
(function initTilt(){
  const cards = document.querySelectorAll('.tilt-card');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  cards.forEach(card => {
    let raf = null;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rotY = px * 10;
        const rotX = -py * 10;
        card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`;
      });
    });

    card.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    });
  });
})();

/* ============================================================
   SMOOTH ANCHOR SCROLL FALLBACK (older browsers)
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target){
      e.preventDefault();
      target.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  });
});
/* ============================================================
   NEURAL CONSTELLATION — persistent WebGL background
   ============================================================ */
   (function initScene(){
    const canvas = document.getElementById('scene');
    if (!window.THREE || !canvas) return;
  
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 40);
  
    // ---- node field ----
    const NODE_COUNT = window.innerWidth < 768 ? 100 : 240;
    const RADIUS = 55;
    const nodePositions = [];
    const nodeGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(NODE_COUNT * 3);
  
    for (let i = 0; i < NODE_COUNT; i++){
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * RADIUS * 2,
        (Math.random() - 0.5) * RADIUS * 2,
        (Math.random() - 0.5) * RADIUS * 2.4
      );
      nodePositions.push(v);
      positions[i*3] = v.x;
      positions[i*3+1] = v.y;
      positions[i*3+2] = v.z;
    }
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
    const nodeMat = new THREE.PointsMaterial({
      color: 0x7c5cff,
      size: 0.6,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    const points = new THREE.Points(nodeGeo, nodeMat);
    scene.add(points);
  
    // ---- synapse lines: connect nearby nodes ----
    const lineVerts = [];
    const MAX_DIST = 9;
    for (let i = 0; i < nodePositions.length; i++){
      for (let j = i+1; j < nodePositions.length; j++){
        if (nodePositions[i].distanceTo(nodePositions[j]) < MAX_DIST){
          lineVerts.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
          lineVerts.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineVerts), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2de2e6, transparent:true, opacity:0.14 });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);
  
    // ---- a slow-rotating wireframe "strategic core" — icosahedron in icosahedron ----
    const coreOuterGeo = new THREE.IcosahedronGeometry(10, 1);
    const coreOuterMat = new THREE.MeshBasicMaterial({ color: 0x7c5cff, wireframe:true, transparent:true, opacity:0.18 });
    const coreOuter = new THREE.Mesh(coreOuterGeo, coreOuterMat);
    coreOuter.position.set(0, 0, -10);
    scene.add(coreOuter);
  
    const coreInnerGeo = new THREE.OctahedronGeometry(5.5, 0);
    const coreInnerMat = new THREE.MeshBasicMaterial({ color: 0x2de2e6, wireframe:true, transparent:true, opacity:0.28 });
    const coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    coreInner.position.set(0, 0, -10);
    scene.add(coreInner);
  
    scene.fog = new THREE.FogExp2(0x05060b, 0.012);
  
    // ---- interaction state ----
    let mouseX = 0, mouseY = 0;
    let targetRotX = 0, targetRotY = 0;
    let scrollProgress = 0;
  
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    }, { passive:true });
  
    function updateScrollProgress(){
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
      const bar = document.getElementById('progressBar');
      if (bar) bar.style.width = (scrollProgress * 100) + '%';
    }
    window.addEventListener('scroll', updateScrollProgress, { passive:true });
    updateScrollProgress();
  
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  
    const clock = new THREE.Clock();
  
    function animate(){
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
  
      if (!reduceMotion){
        points.rotation.y = t * 0.02;
        lines.rotation.y = t * 0.02;
        points.rotation.x = t * 0.008;
        lines.rotation.x = t * 0.008;
  
        coreOuter.rotation.y = t * 0.15;
        coreOuter.rotation.x = t * 0.08;
        coreInner.rotation.y = -t * 0.22;
        coreInner.rotation.x = t * 0.12;
  
        targetRotY += (mouseX * 0.4 - targetRotY) * 0.03;
        targetRotX += (mouseY * 0.3 - targetRotX) * 0.03;
        scene.rotation.y += (targetRotY - scene.rotation.y) * 0.06;
        scene.rotation.x += (-targetRotX - scene.rotation.x) * 0.06;
  
        const targetZ = 40 - scrollProgress * 55;
        camera.position.z += (targetZ - camera.position.z) * 0.05;
  
        const pulse = 0.8 + Math.sin(t * 0.6) * 0.1;
        nodeMat.opacity = pulse;
      }
  
      renderer.render(scene, camera);
    }
    animate();
  })();
  
  /* ============================================================
     CUSTOM CURSOR
     ============================================================ */
  (function initCursor(){
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  
    let mx = window.innerWidth/2, my = window.innerHeight/2;
    let rx = mx, ry = my;
  
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    }, { passive:true });
  
    function loop(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    }
    loop();
  
    const hoverables = document.querySelectorAll('a, button, .tilt-card, .magnetic');
    hoverables.forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
    });
  })();
  
  /* ============================================================
     MAGNETIC BUTTONS
     ============================================================ */
  (function initMagnetic(){
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const els = document.querySelectorAll('.magnetic');
    els.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width/2;
        const y = e.clientY - rect.top - rect.height/2;
        el.style.transform = `translate(${x*0.25}px, ${y*0.35}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
    });
  })();
  
  /* ============================================================
     SCROLL REVEALS
     ============================================================ */
  (function initReveals(){
    const targets = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)){
      targets.forEach(el => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:0.15, rootMargin:'0px 0px -8% 0px' });
  
    targets.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 5) * 60}ms`;
      io.observe(el);
    });
  })();
  
  /* ============================================================
     COUNT-UP STATS
     ============================================================ */
  (function initCountUp(){
    const nums = document.querySelectorAll('.stat .num');
    if (!nums.length || !('IntersectionObserver' in window)) return;
  
    function animateNum(el){
      const target = parseFloat(el.dataset.count);
      const isDecimal = String(target).includes('.');
      const duration = 1400;
      const start = performance.now();
  
      function tick(now){
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = isDecimal ? value.toFixed(2) : Math.round(value);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = isDecimal ? target.toFixed(2) : target;
      }
      requestAnimationFrame(tick);
    }
  
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          animateNum(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold:0.5 });
  
    nums.forEach(el => io.observe(el));
  })();
  
  /* ============================================================
     ORBIT NAV — active section tracking
     ============================================================ */
  (function initNav(){
    const navLinks = document.querySelectorAll('.orbit-nav a');
    const sections = Array.from(navLinks).map(a => document.querySelector(a.getAttribute('href')));
  
    function onScroll(){
      const y = window.scrollY + window.innerHeight * 0.4;
      let activeIdx = 0;
      sections.forEach((sec, i) => {
        if (sec && sec.offsetTop <= y) activeIdx = i;
      });
      navLinks.forEach((a, i) => a.classList.toggle('active', i === activeIdx));
    }
    window.addEventListener('scroll', onScroll, { passive:true });
    onScroll();
  })();
  
  /* ============================================================
     TILT CARDS — 3D CSS tilt following the cursor
     ============================================================ */
  (function initTilt(){
    const cards = document.querySelectorAll('.tilt-card');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
  
    cards.forEach(card => {
      let raf = null;
  
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
  
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const rotY = px * 10;
          const rotX = -py * 10;
          card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`;
        });
      });
  
      card.addEventListener('mouseleave', () => {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      });
    });
  })();
  
  /* ============================================================
     SMOOTH ANCHOR SCROLL FALLBACK (older browsers)
     ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target){
        e.preventDefault();
        target.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  });