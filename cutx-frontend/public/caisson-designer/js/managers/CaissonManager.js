/* ================================================
   CAISSON MANAGER - Gestion de tous les caissons
   ================================================ */

import { Caisson } from '../models/Caisson.js';
import { getDefaultCaissonConfig } from '../core/config.js';

/**
 * Gestionnaire de caissons
 * Centralise la gestion de tous les caissons de la scène
 */
export class CaissonManager {
  constructor(scene) {
    this.scene = scene;
    this.caissons = new Map(); // Map<id, Caisson>
    this.nextId = 1;
    this.selectedCaissonId = null;
  }

  /**
   * Ajoute un nouveau caisson
   * @param {Object} config - Configuration du caisson (optionnel)
   * @param {Object} position - Position du caisson (optionnel)
   * @returns {Caisson} Le caisson créé
   */
  addCaisson(config = null, position = null) {
    const id = this.nextId++;
    const caissonConfig = config || getDefaultCaissonConfig();

    // Position par défaut : décalée si d'autres caissons existent
    const defaultPosition = this.calculateDefaultPosition();
    const finalPosition = position || defaultPosition;

    const caisson = new Caisson(id, caissonConfig, finalPosition);
    this.caissons.set(id, caisson);
    this.scene.add(caisson.group);

    console.log(`✅ Caisson ${id} ajouté à la position`, finalPosition);

    return caisson;
  }

  /**
   * Calcule une position par défaut pour un nouveau caisson
   * (évite les chevauchements)
   */
  calculateDefaultPosition() {
    const spacing = 700; // Espacement entre caissons
    const count = this.caissons.size;
    const row = Math.floor(count / 3);
    const col = count % 3;

    return {
      x: (col - 1) * spacing,
      y: 0,
      z: row * spacing
    };
  }

  /**
   * Supprime un caisson
   * @param {number} id - ID du caisson
   */
  removeCaisson(id) {
    const caisson = this.caissons.get(id);
    if (caisson) {
      this.scene.remove(caisson.group);
      caisson.dispose();
      this.caissons.delete(id);

      if (this.selectedCaissonId === id) {
        this.selectedCaissonId = null;
      }

      console.log(`🗑️ Caisson ${id} supprimé`);
    }
  }

  /**
   * Obtient un caisson par son ID
   * @param {number} id - ID du caisson
   * @returns {Caisson|undefined}
   */
  getCaisson(id) {
    return this.caissons.get(id);
  }

  /**
   * Obtient le caisson sélectionné
   * @returns {Caisson|null}
   */
  getSelectedCaisson() {
    return this.selectedCaissonId ? this.caissons.get(this.selectedCaissonId) : null;
  }

  /**
   * Sélectionne un caisson
   * @param {number} id - ID du caisson
   */
  selectCaisson(id) {
    // Désélectionner le caisson actuel
    if (this.selectedCaissonId) {
      const current = this.caissons.get(this.selectedCaissonId);
      if (current) current.setSelected(false);
    }

    // Sélectionner le nouveau caisson
    this.selectedCaissonId = id;
    const caisson = this.caissons.get(id);
    if (caisson) {
      caisson.setSelected(true);
      console.log(`🎯 Caisson ${id} sélectionné`);
    }
  }

  /**
   * Désélectionne tous les caissons
   */
  deselectAll() {
    if (this.selectedCaissonId) {
      const caisson = this.caissons.get(this.selectedCaissonId);
      if (caisson) caisson.setSelected(false);
      this.selectedCaissonId = null;
    }
  }

  /**
   * Met à jour la configuration du caisson sélectionné
   * @param {Object} newConfig - Nouvelle configuration
   */
  updateSelectedCaissonConfig(newConfig) {
    const caisson = this.getSelectedCaisson();
    if (caisson) {
      caisson.updateConfig(newConfig);
    }
  }

  /**
   * Duplique un caisson
   * @param {number} id - ID du caisson à dupliquer
   * @returns {Caisson|null} Le nouveau caisson
   */
  duplicateCaisson(id) {
    const original = this.caissons.get(id);
    if (original) {
      const newConfig = original.cloneConfig();
      const newPosition = {
        x: original.group.position.x + 700,
        y: original.group.position.y,
        z: original.group.position.z
      };
      return this.addCaisson(newConfig, newPosition);
    }
    return null;
  }

  /**
   * Obtient tous les caissons
   * @returns {Array<Caisson>}
   */
  getAllCaissons() {
    return Array.from(this.caissons.values());
  }

  /**
   * Obtient tous les caissons sauf celui spécifié
   * @param {number} excludeId - ID du caisson à exclure
   * @returns {Array<Caisson>}
   */
  getAllCaissonsExcept(excludeId) {
    return this.getAllCaissons().filter(c => c.id !== excludeId);
  }

  /**
   * Compte le nombre de caissons
   * @returns {number}
   */
  getCount() {
    return this.caissons.size;
  }

  /**
   * Vide tous les caissons
   */
  clear() {
    this.caissons.forEach(caisson => {
      this.scene.remove(caisson.group);
      caisson.dispose();
    });
    this.caissons.clear();
    this.selectedCaissonId = null;
    this.nextId = 1;
  }

  /**
   * Obtient un caisson par son objet 3D
   * @param {THREE.Object3D} object - Objet 3D
   * @returns {Caisson|null}
   */
  getCaissonByObject(object) {
    // Remonter l'arbre pour trouver le groupe du caisson
    let current = object;
    while (current) {
      if (current.userData.type === 'caisson') {
        return this.caissons.get(current.userData.caissonId);
      }
      current = current.parent;
    }
    return null;
  }
}
