import type { AtriumModel, DoorId } from './surface';

const DOORS: { id: DoorId; x: number; planned: boolean; title: string; subtitle: string }[] = [
  { id: 'work', x: -4.2, planned: false, title: 'WORK HQ', subtitle: 'STEP INSIDE' },
  { id: 'learning', x: 0, planned: true, title: 'LEARNING', subtitle: 'COMING LATER' },
  { id: 'wellbeing', x: 4.2, planned: true, title: 'WELLBEING', subtitle: 'COMING LATER' },
];

/** Procedural signs keep the scene independent of external images, fonts, and model hosts. */
function signTexture(THREE: any, title: string, subtitle: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  context.textAlign = 'center';
  context.fillStyle = '#f9edd5';
  context.font = '55px Georgia';
  context.fillText(title, 384, 164);
  context.fillStyle = '#c7b99f';
  context.font = 'bold 22px Arial';
  context.fillText(subtitle, 384, 212);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Three doorways; each is both a visible place and a raycast interaction target. */
function addDoors(THREE: any, scene: any) {
  const hits: any[] = [];
  const doors: { id: DoorId; core: any; light: any; planned: boolean }[] = [];
  const masonry = new THREE.MeshStandardMaterial({
    color: '#52616a',
    roughness: 0.7,
    metalness: 0.25,
  });
  const bronze = new THREE.MeshStandardMaterial({
    color: '#b99b68',
    metalness: 0.72,
    roughness: 0.3,
  });
  for (const door of DOORS) {
    const group = new THREE.Group();
    group.position.set(door.x, 0, -7.4);
    scene.add(group);
    for (const sign of [-1, 1]) {
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.75, 0.45), masonry);
      column.position.set(sign * 1.18, 1.38, 0);
      group.add(column);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.68, 0.5), bronze);
      rim.position.set(sign * 1.02, 1.38, 0.04);
      group.add(rim);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.16, 12, 56, Math.PI), bronze);
    arch.position.y = 2.74;
    group.add(arch);
    const core = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2.7),
      new THREE.MeshStandardMaterial({
        color: door.planned ? '#163342' : '#27535c',
        emissive: door.planned ? '#266476' : '#d1aa60',
        emissiveIntensity: door.planned ? 0.18 : 0.65,
        roughness: 0.3,
        metalness: 0.38,
        side: THREE.DoubleSide,
      }),
    );
    core.position.set(0, 1.4, 0.06);
    core.userData.door = door.id;
    group.add(core);
    hits.push(core);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 1.35),
      new THREE.MeshBasicMaterial({
        map: signTexture(THREE, door.title, door.subtitle),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    label.position.set(0, 1.65, 0.09);
    label.userData.door = door.id;
    group.add(label);
    hits.push(label);
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.55, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: '#8d7a60', metalness: 0.35, roughness: 0.75 }),
    );
    step.position.set(0, 0, 0.7);
    group.add(step);
    const light = new THREE.PointLight(
      door.planned ? '#5195aa' : '#f8c77d',
      door.planned ? 4 : 8,
      8,
      1.6,
    );
    light.position.set(0, 2.1, 1.35);
    group.add(light);
    doors.push({ id: door.id, core, light, planned: door.planned });
  }
  return { doors, hits };
}

function addArchitecture(THREE: any, scene: any) {
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 0.45, 100),
    new THREE.MeshStandardMaterial({ color: '#13222f', roughness: 0.85, metalness: 0.14 }),
  );
  floor.position.y = -0.31;
  scene.add(floor);
  for (const radius of [3.4, 6.7, 10.5, 16.8]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.038, radius + 0.038, 128),
      new THREE.MeshBasicMaterial({
        color: '#bd9b66',
        transparent: true,
        opacity: radius > 10 ? 0.22 : 0.5,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.065;
    scene.add(ring);
  }
  for (const x of [-12, 12]) {
    for (const z of [-9, 0, 8]) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.7, 9, 14),
        new THREE.MeshStandardMaterial({ color: '#394a56', roughness: 0.8 }),
      );
      pillar.position.set(x, 4.3, z);
      scene.add(pillar);
    }
  }
  const stars = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) {
    stars[i * 3] = Math.sin(i * 89.3) * 40;
    stars[i * 3 + 1] = 6 + Math.abs(Math.sin(i * 33.7)) * 22;
    stars[i * 3 + 2] = Math.cos(i * 41.9) * 36 - 10;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const sky = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: '#c4c7cc',
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
    }),
  );
  scene.add(sky);
}

function addGuide(THREE: any, scene: any) {
  const pivot = new THREE.Group();
  pivot.position.set(0, 2.15, 3.5);
  scene.add(pivot);
  const material = new THREE.MeshStandardMaterial({
    color: '#ffd69a',
    emissive: '#e4a75d',
    emissiveIntensity: 1.4,
    metalness: 0.38,
    roughness: 0.18,
  });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 2), material);
  pivot.add(orb);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.016, 8, 72),
    new THREE.MeshBasicMaterial({ color: '#e9ba72', transparent: true, opacity: 0.85 }),
  );
  halo.rotation.x = 0.55;
  pivot.add(halo);
  const glow = new THREE.PointLight('#ffca8e', 5, 9, 1.4);
  pivot.add(glow);
  return { pivot, orb, halo, glow, material };
}

/** Lazy, contained Three.js scene; everything is released when the person leaves. */
export async function mountAtrium(
  element: HTMLElement,
  model: AtriumModel,
  choose: (id: DoorId) => void,
): Promise<() => void> {
  const THREE = await import('three');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07121f');
  scene.fog = new THREE.FogExp2('#07121f', 0.021);
  scene.add(new THREE.HemisphereLight('#d4e6ff', '#28323a', 2.3));
  const sun = new THREE.DirectionalLight('#ffe3bd', 4);
  sun.position.set(-5, 12, 8);
  scene.add(sun);
  addArchitecture(THREE, scene);
  const doors = addDoors(THREE, scene);
  const guide = addGuide(THREE, scene);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.set(0, reduced ? 3.1 : 5.6, reduced ? 11.8 : 17);
  const target = new THREE.Vector3(0, 1.4, -4);
  camera.lookAt(target);
  element.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'manipulation';
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let panX = 0;
  let panY = 0;
  let frame = 0;
  let alive = true;

  const resize = () => {
    const width = Math.max(1, element.clientWidth);
    const height = Math.max(1, element.clientHeight);
    camera.aspect = width / height;
    camera.fov = height > width ? 57 : 44;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  resize();

  const doorAt = (event: PointerEvent): DoorId | undefined => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(doors.hits)[0]?.object.userData.door;
  };
  const move = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    panX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    panY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const hit = doorAt(event);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
    if (hit) model.focus(hit);
  };
  const click = (event: PointerEvent) => {
    const hit = doorAt(event);
    if (hit) choose(hit);
  };
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerdown', click);

  const tick = () => {
    if (!alive) return;
    const time = performance.now() / 1000;
    const selected = DOORS.find((d) => d.id === model.selected);
    const focus = selected?.x ?? 0;
    const revealing = model.inScene('arrival') && !reduced;
    const wantedX = focus * 0.21 + (reduced ? 0 : panX * 0.13);
    const wantedY = revealing ? 4.25 : 3.1 + (reduced ? 0 : panY * -0.12);
    const wantedZ = revealing ? 14.3 : 11.8;
    const easing = reduced ? 1 : 0.032;
    camera.position.x += (wantedX - camera.position.x) * easing;
    camera.position.y += (wantedY - camera.position.y) * easing;
    camera.position.z += (wantedZ - camera.position.z) * easing;
    target.x += (focus * 0.38 - target.x) * easing;
    camera.lookAt(target);

    for (const door of doors.doors) {
      const chosen = model.selected === door.id;
      const baseline = door.planned ? 0.17 : 0.65;
      door.core.material.emissiveIntensity = chosen
        ? 1.7
        : baseline + (reduced ? 0 : 0.07 * Math.sin(time * 1.4));
      door.light.intensity = chosen ? 11 : door.planned ? 3 : 7;
    }
    const pulse = reduced ? 0 : Math.sin(time * 2.8) * 0.045;
    guide.orb.scale.setScalar(1 + pulse + Math.min(model.energy || 0, 1) * 0.16);
    guide.material.emissiveIntensity = model.speaking ? 2.7 : 1.4;
    guide.halo.rotation.z = reduced ? 0 : time * 0.28;
    guide.pivot.position.y = 2.15 + (reduced ? 0 : Math.sin(time * 1.2) * 0.09);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    alive = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    renderer.domElement.removeEventListener('pointermove', move);
    renderer.domElement.removeEventListener('pointerdown', click);
    scene.traverse((obj: any) => {
      obj.geometry?.dispose?.();
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
          material.map?.dispose?.();
          material.dispose?.();
        }
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
