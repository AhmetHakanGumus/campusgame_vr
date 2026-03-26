function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function addMonument({ scene, x, z, w, h, d, color, IS_MOB }) {
    const THREE = window.THREE;
    const baseY = 0;
    const coreH = h * 0.72;
    const pedestalH = h * 0.18;
    const pedestalW = w * 0.8;
    const pedestalD = d * 0.65;

    const group = new THREE.Group();
    group.position.set(x, baseY, z);

    const stone = new THREE.MeshStandardMaterial({
        color: color ?? 0xc9b08a,
        roughness: 0.95,
        metalness: 0.05
    });
    const dark = new THREE.MeshStandardMaterial({
        color: 0x8a7a63,
        roughness: 1,
        metalness: 0
    });
    const glass = new THREE.MeshStandardMaterial({
        color: 0x9ad3ff,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35
    });

    const pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(pedestalW, pedestalH, pedestalD),
        stone
    );
    pedestal.position.set(0, pedestalH / 2, 0);
    pedestal.castShadow = !IS_MOB;
    pedestal.receiveShadow = !IS_MOB;
    group.add(pedestal);

    // Ana obelisk
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.08, w * 0.10, coreH, 18), stone);
    shaft.position.set(0, pedestalH + coreH / 2, 0);
    shaft.castShadow = !IS_MOB;
    shaft.receiveShadow = !IS_MOB;
    group.add(shaft);

    // Üst başlık
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h * 0.08, w * 0.16), dark);
    cap.position.set(0, pedestalH + coreH + h * 0.04, 0);
    cap.castShadow = !IS_MOB;
    cap.receiveShadow = !IS_MOB;
    group.add(cap);

    // Küçük "işaret" cam parçası
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w * 0.06, h * 0.10, w * 0.02), glass);
    pane.position.set(0, pedestalH + coreH * 0.55, d * 0.12);
    pane.castShadow = false;
    pane.receiveShadow = false;
    group.add(pane);

    scene.add(group);
    return group;
}

export function addGapYenev({ scene, x, z, w, h, d, color, IS_MOB }) {
    const THREE = window.THREE;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);

    const baseRadius = Math.min(w, d) / 2;
    const coreR = Math.max(1.2, baseRadius * 0.18);
    const rMax = Math.max(coreR + 2.5, baseRadius * 0.92);
    const yMax = h * 0.92;

    const turns = 2.8;
    const arms = 3;
    const N = IS_MOB ? 52 : 76; // segment sayısı (performans/kalite dengesi)
    const radialSeg = IS_MOB ? 6 : 8;

    const matArmLight = new THREE.MeshStandardMaterial({
        color: 0xbdbdbd,
        roughness: 0.92,
        metalness: 0.05
    });
    const matArmDark = new THREE.MeshStandardMaterial({
        color: 0x8f8f8f,
        roughness: 1,
        metalness: 0
    });
    const matPath = new THREE.MeshStandardMaterial({
        color: 0xd76a33,
        roughness: 1,
        metalness: 0
    });
    const matCore = new THREE.MeshStandardMaterial({
        color: 0x6c6c6c,
        roughness: 1,
        metalness: 0
    });
    const matTower = new THREE.MeshStandardMaterial({
        color: 0xa7a7a7,
        roughness: 0.92,
        metalness: 0.05
    });
    const matPanel = new THREE.MeshStandardMaterial({
        color: 0x2b2b2b,
        roughness: 0.25,
        metalness: 0.25,
        emissive: 0x111111,
        emissiveIntensity: 0.65
    });
    const matTowerDark = new THREE.MeshStandardMaterial({
        color: 0x6f6f6f,
        roughness: 1,
        metalness: 0
    });

    // Core (düşük kulübe/avlu)
    const coreH = Math.max(1.0, h * 0.16);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(coreR * 1.05, coreR * 1.05, coreH, 24), matCore);
    core.position.set(0, coreH / 2, 0);
    core.castShadow = !IS_MOB;
    core.receiveShadow = !IS_MOB;
    group.add(core);
    // Dome (kubbe hissi)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(coreR * 1.02, 24, 16), matCore);
    dome.scale.set(1, 0.45, 1);
    dome.position.set(0, coreH * 0.95, 0);
    dome.castShadow = !IS_MOB;
    dome.receiveShadow = !IS_MOB;
    group.add(dome);

    function rAt(t) {
        // içten dışa konik spiral gibi genişleme
        return lerp(coreR, rMax, Math.pow(t, 0.78));
    }
    function thetaAt(t, armIdx) {
        return armIdx * ((Math.PI * 2) / arms) + turns * Math.PI * 2 * t;
    }
    function yAt(t) {
        return yMax * Math.pow(t, 1.12);
    }
    function radiusAt(t) {
        // ince uç -> kalın uç
        return lerp(baseRadius * 0.05, baseRadius * 0.16, Math.pow(t, 0.9));
    }

    // Sol/sağ "paths" (negatif alanlarda yollar) - basit spiral şeritler
    // Armların tam arası: i+0.5 faz kaydırma.
    const pathT0 = 0.05, pathT1 = 0.95;
    for (let gap = 0; gap < arms; gap++) {
        const armIdx = gap;
        const offsetArmPhase = (armIdx + 0.5) * ((Math.PI * 2) / arms);
        let prev = null;
        const segSteps = IS_MOB ? 42 : 62;
        for (let s = 0; s <= segSteps; s++) {
            const t = lerp(pathT0, pathT1, s / segSteps);
            const r = rAt(t);
            const theta = offsetArmPhase + turns * Math.PI * 2 * t;
            const px = r * Math.cos(theta);
            const pz = r * Math.sin(theta);
            const py = coreH * 0.12 + yAt(t) * 0.03; // zemin bandı

            const p = new THREE.Vector3(px, py, pz);
            if (prev) {
                const dir = p.clone().sub(prev);
                const len = dir.length();
                if (len > 0.01) {
                    const mid = prev.clone().add(p).multiplyScalar(0.5);
                    const rad = Math.max(0.05, radiusAt(t) * 0.55);
                    const geom = new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, len, radialSeg);
                    const mesh = new THREE.Mesh(geom, matPath);
                    const q = new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        dir.clone().normalize()
                    );
                    mesh.quaternion.copy(q);
                    mesh.position.copy(mid);
                    mesh.castShadow = !IS_MOB;
                    mesh.receiveShadow = !IS_MOB;
                    group.add(mesh);
                }
            }
            prev = p;
        }
    }

    // Spiral kanatlar
    function addArm(armIdx) {
        let prev = null;
        for (let s = 0; s <= N; s++) {
            const t0 = s / N;
            const r = rAt(t0);
            const theta = thetaAt(t0, armIdx);
            const px = r * Math.cos(theta);
            const pz = r * Math.sin(theta);
            const py = yAt(t0);
            const p = new THREE.Vector3(px, py, pz);

            if (prev) {
                const dir = p.clone().sub(prev);
                const len = dir.length();
                if (len > 0.01) {
                    const mid = prev.clone().add(p).multiplyScalar(0.5);
                    const tm = (t0 + (s - 1) / N) / 2;
                    const rad = radiusAt(tm);

                    const geom = new THREE.CylinderGeometry(rad * 0.9, rad, len, radialSeg);
                    // Yüksek kısımlarda daha açık ton (çatı hissi)
                    const mat = t0 > 0.62 ? matArmLight : matArmDark;
                    const mesh = new THREE.Mesh(geom, mat);

                    const q = new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        dir.clone().normalize()
                    );
                    mesh.quaternion.copy(q);
                    mesh.position.copy(mid);
                    mesh.castShadow = !IS_MOB;
                    mesh.receiveShadow = !IS_MOB;
                    group.add(mesh);
                }
            }
            prev = p;
        }
    }

    for (let i = 0; i < arms; i++) addArm(i);

    // Uç kuleler
    for (let i = 0; i < arms; i++) {
        const t = 1;
        const r = rAt(t);
        const theta = thetaAt(t, i);
        const px = r * Math.cos(theta);
        const pz = r * Math.sin(theta);
        const py = yAt(t);

        const towerW = baseRadius * 0.10;
        const towerD = baseRadius * 0.06;
        const towerH = h * 0.40;

        const tower = new THREE.Mesh(
            new THREE.BoxGeometry(towerW, towerH, towerD),
            matTower
        );
        tower.position.set(px, py + towerH / 2, pz);
        tower.castShadow = !IS_MOB;
        tower.receiveShadow = !IS_MOB;
        group.add(tower);

        // basit pencere ızgarası
        const winMat = IS_MOB
            ? matTowerDark
            : new THREE.MeshStandardMaterial({ color: 0x5aa3ff, emissive: 0x102a44, emissiveIntensity: 0.2, roughness: 0.2, metalness: 0 });
        const floors = 5;
        for (let f = 0; f < floors; f++) {
            const wy = lerp(py + towerH * 0.15, py + towerH * 0.85, f / (floors - 1));
            const win = new THREE.Mesh(
                new THREE.BoxGeometry(towerW * 0.72, towerH * 0.10, towerD * 0.45),
                winMat
            );
            win.position.set(px, wy, pz + towerD * 0.02);
            win.castShadow = false;
            win.receiveShadow = false;
            group.add(win);
        }
    }

    // Solar paneller: "Güneydoğu yönünde" en yakın radial yönü olan kolda
    const SE2 = new THREE.Vector2(1, -1).normalize();
    const tPanel = 0.70;
    let bestArm = 0;
    let bestDot = -Infinity;
    for (let i = 0; i < arms; i++) {
        const theta = thetaAt(tPanel, i);
        const radial2 = new THREE.Vector2(Math.cos(theta), Math.sin(theta)).normalize();
        const dot = radial2.dot(SE2);
        if (dot > bestDot) {
            bestDot = dot;
            bestArm = i;
        }
    }

    const normalSE = new THREE.Vector3(1, 0, -1).normalize();
    const panelGeo = new THREE.PlaneGeometry(baseRadius * 0.06, baseRadius * 0.03);

    const panelTs = [0.58, 0.65, 0.72, 0.80, 0.88, 0.95];
    for (const t of panelTs) {
        const r = rAt(t);
        const theta = thetaAt(t, bestArm);
        const px = r * Math.cos(theta);
        const pz = r * Math.sin(theta);
        const py = yAt(t);

        const panel = new THREE.Mesh(panelGeo, matPanel);
        panel.position.set(px, py * 0.95, pz);

        // Panel normalini SE'ye çevir
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalSE);
        panel.quaternion.copy(q);

        // Hafif yukarı tilt
        panel.rotateX(-Math.PI * 0.08);

        panel.castShadow = false;
        panel.receiveShadow = !IS_MOB;
        group.add(panel);
    }

    return group;
}

