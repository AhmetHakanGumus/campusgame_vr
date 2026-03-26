'use strict';

function makeStoneBlockTexture(THREE) {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 1024;
    const c = cv.getContext('2d');

    c.fillStyle = '#c6a37a';
    c.fillRect(0, 0, cv.width, cv.height);

    const rowH = 80;
    for (let y = 0; y < cv.height; y += rowH) {
        const offset = ((y / rowH) % 2) ? 35 : 0;
        for (let x = -offset; x < cv.width; x += 140) {
            const w = 120 + (Math.random() * 24 - 12);
            const h = rowH - 6;
            const hue = 28 + Math.random() * 8;
            const sat = 32 + Math.random() * 10;
            const lit = 58 + Math.random() * 10;
            c.fillStyle = `hsl(${hue} ${sat}% ${lit}%)`;
            c.fillRect(x, y + 3, w, h);
            c.strokeStyle = 'rgba(85,65,45,0.24)';
            c.lineWidth = 2;
            c.strokeRect(x, y + 3, w, h);
        }
    }

    // Hafif kir / pürüz
    for (let i = 0; i < 4200; i++) {
        c.globalAlpha = 0.03 + Math.random() * 0.07;
        c.fillStyle = Math.random() > 0.5 ? '#7f6548' : '#e0c39e';
        c.fillRect(Math.random() * cv.width, Math.random() * cv.height, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    c.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.5, 2.5);
    return tex;
}

export function addUniversityMainGate({ scene, IS_MOB, buildingAABBs }) {
    const THREE = window.THREE;
    const GATE_Z = 82;
    const gateRoot = new THREE.Group();
    gateRoot.position.set(0, 0, GATE_Z);
    gateRoot.userData.isWelcomeGate = true;
    scene.add(gateRoot);

    const objLoader = new THREE.OBJLoader();
    const texLoader = new THREE.TextureLoader();
    const stoneTex = makeStoneBlockTexture(THREE);

    return new Promise((resolve, reject) => {
        objLoader.load(
            '/models/Harran-Kapi.obj',
            (obj) => {
                const stoneMat = new THREE.MeshStandardMaterial({
                    map: stoneTex,
                    color: 0xffffff,
                    roughness: 0.95,
                    metalness: 0
                });

                obj.traverse((m) => {
                    if (!m.isMesh) return;
                    m.material = stoneMat;
                    m.castShadow = !IS_MOB;
                    m.receiveShadow = !IS_MOB;
                });

                // Biraz daha büyük
                const box0 = new THREE.Box3().setFromObject(obj);
                const size0 = new THREE.Vector3();
                box0.getSize(size0);
                const targetWidth = 34;
                const targetHeight = 20;
                const scale = Math.max(targetWidth / (size0.x || 1), targetHeight / (size0.y || 1));
                obj.scale.multiplyScalar(scale);

                const box1 = new THREE.Box3().setFromObject(obj);
                obj.position.y -= box1.min.y; // yere oturt
                gateRoot.add(obj);

                // Orta direk yuvarlak kabartma bölgesine logo
                const boxF = new THREE.Box3().setFromObject(obj);
                const sizeF = new THREE.Vector3();
                boxF.getSize(sizeF);
                const logoTex = texLoader.load('/Images/harran_universitesi_logo.png');
                logoTex.anisotropy = 8;

                const logoSize = Math.max(1.6, sizeF.y * 0.12);
                const logo = new THREE.Mesh(
                    new THREE.CircleGeometry(logoSize * 0.5, 48),
                    new THREE.MeshBasicMaterial({
                        map: logoTex,
                        transparent: true,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    })
                );

                // Direk üstündeki yuvarlak kabartma için yaklaşık hedef
                logo.position.set(0, boxF.max.y - sizeF.y * 0.2, boxF.max.z - sizeF.z * 0.06);
                obj.add(logo);

                // Solid bölümlerden geçmeyi engellemek için yaklaşık çarpışma kutuları
                // (merkez direk + sağ/sol ana taşıyıcılar). Kemer boşlukları açık kalır.
                if (Array.isArray(buildingAABBs)) {
                    const hz = 1.3;
                    buildingAABBs.push({ x0: -2.4, x1: 2.4, z0: GATE_Z - hz, z1: GATE_Z + hz });       // orta direk
                    buildingAABBs.push({ x0: -13.2, x1: -9.5, z0: GATE_Z - hz, z1: GATE_Z + hz });      // sol taşıyıcı
                    buildingAABBs.push({ x0: 9.5, x1: 13.2, z0: GATE_Z - hz, z1: GATE_Z + hz });        // sağ taşıyıcı
                    buildingAABBs.push({ x0: -27.0, x1: -18.0, z0: GATE_Z - hz, z1: GATE_Z + hz });     // sol yan gövde
                    buildingAABBs.push({ x0: 18.0, x1: 27.0, z0: GATE_Z - hz, z1: GATE_Z + hz });       // sağ yan gövde
                }

                resolve(gateRoot);
            },
            undefined,
            (err) => {
                reject(err);
            }
        );
    });
}

export function updateUniversityGateAnimations() {
    // Bayraklar kaldırıldı; animasyon yok.
}
