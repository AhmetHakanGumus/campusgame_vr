'use strict';

import { IS_MOB, IS_QUEST } from './config.js';

export function applyPlatformDom() {
    if (IS_MOB) {
        document.getElementById('pc-controls').style.display = 'none';
        document.getElementById('mob-controls').style.display = 'grid';
    }
    if (IS_QUEST) {
        document.getElementById('pc-controls').style.display = 'none';
        document.getElementById('mob-controls').style.display = 'none';
        document.getElementById('vr-controls').style.display = 'grid';
        document.body.classList.add('is-quest');
    }
}
