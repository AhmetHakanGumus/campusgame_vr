'use strict';

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/** Eski yemekhane kutusunun güney yüzü (z1); satranç ~z=42 — model bu çizgiyi geçmesin. */
const MAX_BUILDING_SOUTH_Z = 37;

/**
 * Rektörlük binası OBJ modeli — yemekhane kutusu yerine, satranç alanının kuzeyinde kalacak şekilde.
 */
export function addRektorlukBuilding({ scene, IS_MOB, buildingAABBs }) {
    const objLoader = new OBJLoader();
    const mat = new THREE.MeshStandardMaterial({
        color: 0xd4a96a,
        roughness: 0.88,
        metalness: 0.05
    });

    return new Promise((resolve, reject) => {
        objLoader.load(
            '/models/Rektorluk-binasi.obj',
            (obj) => {
                const root = new THREE.Group();
                root.name = 'RektorlukBinasi';

                obj.traverse((m) => {
                    if (!m.isMesh) return;
                    m.material = mat;
                    m.castShadow = !IS_MOB;
                    m.receiveShadow = !IS_MOB;
                });

                const box0 = new THREE.Box3().setFromObject(obj);
                const size0 = new THREE.Vector3();
                box0.getSize(size0);
                const targetWidth = 34;
                const scale = targetWidth / Math.max(size0.x, size0.z, 0.001);
                obj.scale.multiplyScalar(scale);

                const box1 = new THREE.Box3().setFromObject(obj);
                const cx = (box1.min.x + box1.max.x) / 2;
                obj.position.x -= cx;
                obj.position.y -= box1.min.y;

                root.add(obj);
                const box2 = new THREE.Box3().setFromObject(obj);
                root.position.z = MAX_BUILDING_SOUTH_Z - box2.max.z;
                scene.add(root);

                const worldBox = new THREE.Box3().setFromObject(root);
                if (Array.isArray(buildingAABBs)) {
                    buildingAABBs.push({
                        x0: worldBox.min.x,
                        x1: worldBox.max.x,
                        z0: worldBox.min.z,
                        z1: worldBox.max.z
                    });
                }

                resolve(root);
            },
            undefined,
            (err) => reject(err)
        );
    });
}
