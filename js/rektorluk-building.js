'use strict';

import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/** Eski yemekhane kutusunun güney yüzü (z1); satranç ~z=42 — model bu çizgiyi geçmesin. */
const MAX_BUILDING_SOUTH_Z = 37;

const MODEL_BASE = '/models/';
const OBJ_NAME = 'Rektorluk-binasi.obj';
const MTL_NAME = 'Rektorluk-binasi.mtl';

function applyShadowsToMeshes(obj, IS_MOB) {
    obj.traverse((m) => {
        if (!m.isMesh) return;
        m.castShadow = !IS_MOB;
        m.receiveShadow = !IS_MOB;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
            if (mat && mat.isMeshPhongMaterial) {
                mat.needsUpdate = true;
            }
        });
    });
}

/**
 * Blender MTL/OBJ materyalleri (Kd renkleri, isteğe bağlı dokular) — tek düz renk ezilmez.
 */
export function addRektorlukBuilding({ scene, IS_MOB, buildingAABBs }) {
    return new Promise((resolve, reject) => {
        const mtlLoader = new MTLLoader();
        mtlLoader.setPath(MODEL_BASE);
        mtlLoader.setResourcePath(MODEL_BASE);
        mtlLoader.load(
            MTL_NAME,
            (materials) => {
                materials.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.setPath(MODEL_BASE);
                objLoader.load(
                    OBJ_NAME,
                    (obj) => {
                        const root = new THREE.Group();
                        root.name = 'RektorlukBinasi';

                        applyShadowsToMeshes(obj, IS_MOB);

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
                    reject
                );
            },
            undefined,
            reject
        );
    });
}
