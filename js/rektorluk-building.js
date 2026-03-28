'use strict';

import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/** Eski yemekhane kutusunun güney yüzü (z1); satranç ~z=42 — model bu çizgiyi geçmesin. */
const MAX_BUILDING_SOUTH_Z = 37;

const MODEL_BASE = '/models/';

/** Önce standart isimler; yoksa Blender'ın ürettiği .mtl.obj / .mtl.mtl sonekleri (Vercel/Linux büyük/küçük harf duyarlı). */
const MODEL_FILE_PAIRS = [
    ['Rektorluk-binasi.mtl', 'Rektorluk-binasi.obj'],
    ['Rektorluk-binasi.mtl.mtl', 'Rektorluk-binasi.mtl.obj']
];

/**
 * Three.js FileLoader bazen Error yerine ProgressEvent verir; .message undefined olur.
 */
function loaderErrorMessage(e) {
    if (e == null) return 'Bilinmeyen yükleme hatası';
    if (typeof e === 'string') return e;
    if (e instanceof Error && e.message) return e.message;
    if (e.message) return String(e.message);
    const t = e.target;
    if (t && typeof t.status === 'number') {
        const url = t.responseURL || '';
        if (t.status === 404) {
            return `Model dosyası bulunamadı (404). Sunucuda /public/models/ altında OBJ ve MTL commitlendi mi? ${url}`;
        }
        return `HTTP ${t.status} ${t.statusText || ''} ${url}`.trim();
    }
    return String(e);
}

/**
 * MTLLoader MeshPhongMaterial üretir; renk dokuları webde doğru görünsün diye sRGB.
 * (Normal/alpha haritaları lineer kalır.)
 */
function fixTextureEncodingForMtlMaterials(obj) {
    const sRGB = THREE.sRGBEncoding;
    const linear = THREE.LinearEncoding;
    obj.traverse((m) => {
        if (!m.isMesh) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
            if (!mat || !mat.isMeshPhongMaterial) return;
            const setEnc = (tex, enc) => {
                if (tex && tex.isTexture) {
                    tex.encoding = enc;
                    tex.needsUpdate = true;
                }
            };
            setEnc(mat.map, sRGB);
            setEnc(mat.emissiveMap, sRGB);
            setEnc(mat.specularMap, sRGB);
            setEnc(mat.bumpMap, linear);
            setEnc(mat.alphaMap, linear);
            mat.needsUpdate = true;
        });
    });
}

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

/** MTL'de map_Kd yoksa (Blender export eksik) — kod ekstra doku uygulamaz. */
function warnIfNoDiffuseTextures(obj) {
    let hasMap = false;
    obj.traverse((m) => {
        if (!m.isMesh || hasMap) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
            if (mat && mat.map) {
                hasMap = true;
                break;
            }
        }
    });
    if (!hasMap) {
        console.warn(
            '[Rektörlük] Yüzeyde doku (map) yok. Blender’dan OBJ+MTL export edin; PNG’ler public/models/ içinde olsun; .mtl içinde map_Kd satırları görünsün.'
        );
    }
}

function loadMtlThenObj(mtlFile, objFile) {
    return new Promise((resolve, reject) => {
        const mtlLoader = new MTLLoader();
        mtlLoader.setPath(MODEL_BASE);
        mtlLoader.setResourcePath(MODEL_BASE);
        mtlLoader.load(
            mtlFile,
            (materials) => {
                materials.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.setPath(MODEL_BASE);
                objLoader.load(
                    objFile,
                    (obj) => resolve(obj),
                    undefined,
                    (err) => reject(new Error(loaderErrorMessage(err)))
                );
            },
            undefined,
            (err) => reject(new Error(loaderErrorMessage(err)))
        );
    });
}

/**
 * Blender MTL/OBJ materyalleri (Kd renkleri, isteğe bağlı dokular).
 */
export function addRektorlukBuilding({ scene, IS_MOB, buildingAABBs }) {
    return (async () => {
        let lastErr = null;
        let obj = null;
        for (const [mtlName, objName] of MODEL_FILE_PAIRS) {
            try {
                obj = await loadMtlThenObj(mtlName, objName);
                break;
            } catch (e) {
                lastErr = e;
            }
        }
        if (!obj) {
            const hint = lastErr instanceof Error ? lastErr.message : String(lastErr);
            throw new Error(
                `Rektörlük modeli yüklenemedi: ${hint}. Denenen dosyalar: ${MODEL_FILE_PAIRS.map(([m, o]) => `${m} + ${o}`).join('; ')}`
            );
        }

        const root = new THREE.Group();
        root.name = 'RektorlukBinasi';

        fixTextureEncodingForMtlMaterials(obj);
        warnIfNoDiffuseTextures(obj);
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

        return root;
    })();
}
