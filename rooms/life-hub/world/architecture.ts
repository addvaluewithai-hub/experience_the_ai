export function addArchitecture(THREE: any, scene: any) {
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
