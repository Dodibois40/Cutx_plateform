# Specifications Techniques - Configurateur Caisson CutX

## Sources de Reference

Ce document est base sur des standards industriels reconnus:

- [Wikipedia - 32mm Cabinetmaking System](https://en.wikipedia.org/wiki/32_mm_cabinetmaking_system)
- [Marathon Hardware - System 32](https://marathonhardware.com/system-32)
- [WoodWeb - Methods of 32mm System Layout](https://woodweb.com/knowledge_base/Methods_of_32_mm_system_layout.html)
- [WoodWeb - Blum Hinge Drilling Locations](https://woodweb.com/knowledge_base/Blum_hinge_drilling_locations.html)
- [Hafele - Minifix 15 Specifications](https://www.hafele.com/us/en/product/connector-housing-minifix-15/P-00861332/)
- [dprojects/Woodworking](https://github.com/dprojects/Woodworking) - FreeCAD Workbench

---

## 1. Systeme 32 (32mm Cabinetmaking System)

### 1.1 Principe Fondamental

Le systeme 32mm est un standard international pour la production de meubles en kit (RTA) et armoires frameless (style europeen).

**Caracteristiques:**
- Colonnes de trous de 5mm de diametre
- Espacement de 32mm entre les centres des trous
- Permet le positionnement reconfigurable des etageres, portes, tiroirs et quincaillerie

### 1.2 Specifications des Trous Systeme

| Parametre | Valeur | Notes |
|-----------|--------|-------|
| **Diametre trou** | 5 mm | Standard pour taquets d'etagere |
| **Espacement vertical** | 32 mm | Entre centres |
| **Distance bord avant** | 37 mm | Centre du trou au bord avant |
| **Distance bord arriere** | 37 mm | Ou multiple de 32mm du bord avant |
| **Profondeur trou** | 13 mm | Standard (12.5-14mm acceptable) |

### 1.3 Rangees de Percage

```
PANNEAU LATERAL (vue de face)
+------------------------------------------+
|                                          |
|   o    o                                 | <- Rangee arriere (37mm du bord arriere)
|   |    |                                 |
|   32mm espacement                        |
|   |    |                                 |
|   o    o                                 |
|   |    |                                 |
|   o    o              o    o             | <- Rangee avant (37mm du bord avant)
|   |    |              |    |             |
|   o    o              o    o             |
|   |                   |                  |
|<->|                   |<---------------->|
| 37mm                  Distance = n × 32mm|
+------------------------------------------+
     AVANT                          ARRIERE
```

### 1.4 Trous de Construction (8mm)

Pour assemblage avec tourillons ou vis Confirmat:
- **Diametre:** 8 mm
- **Profondeur:** 12-15 mm (tourillons) ou traversant (vis)
- **Position:** Independante de la grille System 32

---

## 2. Charnieres Blum CLIP TOP

### 2.1 Specifications Generales

| Parametre | Valeur | Notes |
|-----------|--------|-------|
| **Diametre cup** | 35 mm | Standard europeen |
| **Profondeur percage cup** | 11.7 - 13 mm | Forstner 35mm |
| **Distance bord-centre** | 3-6 mm (125°) / 3-8 mm (170°) | Variable selon modele |
| **Espacement vis fixation** | 45 mm | Entre les 2 vis |
| **Distance vis derriere cup** | 9.5 mm | Centre cup au centre vis |

### 2.2 Position Standard Frameless

Pour armoires sans cadre (frameless/europeen):
- **Distance bord porte au centre cup:** 23 mm (standard)
- Cela laisse ~5.5mm entre le bord du trou et le bord de la porte

### 2.3 Nombre de Charnieres par Hauteur de Facade

| Hauteur Facade | Nombre Charnieres |
|----------------|-------------------|
| ≤ 600 mm | 2 |
| 601 - 1000 mm | 3 |
| 1001 - 1400 mm | 4 |
| 1401 - 1800 mm | 5 |
| > 1800 mm | 6 |

### 2.4 Positions des Charnieres

```
FACADE (vue de face - charnieres a gauche)
+------------------------+
|  o  <-- 100mm du haut  |
|  |                     |
|  |  Espacement         |
|  |  uniforme           |
|  |                     |
|  o                     |
|  |                     |
|  |                     |
|  o  <-- 100mm du bas   |
+------------------------+
|<->|
21.5mm du bord (standard Blum)
```

**Formule espacement:**
```
espacement = (hauteurFacade - 200mm) / (nombreCharnieres - 1)
```

---

## 3. Coulisses Blum TANDEM

### 3.1 Specifications de Montage

| Parametre | Valeur | Notes |
|-----------|--------|-------|
| **Retrait avant (setback)** | 3 mm | Du bord avant du panneau |
| **Retrait TANDEM Edge** | 4 mm | Version fine |
| **Trou arriere tiroir** | Ø 6 mm × 10 mm prof. | Pour crochet arriere |
| **Encoche arriere** | 12.7 × 35 mm (H×L) | Pour accroche |

### 3.2 Calcul Largeur Tiroir

```
Largeur_interieure_tiroir = Ouverture_caisson - 42mm
```

### 3.3 Positions sur Panneau Lateral

Les coulisses se montent sur les rangees System 32:
- **Rangee avant:** 37mm du bord avant
- **Rangee arriere:** Multiple de 32mm de la rangee avant

---

## 4. Connecteurs Minifix 15

### 4.1 Specifications Percage

| Parametre | Valeur | Notes |
|-----------|--------|-------|
| **Diametre logement** | 15 mm | Trou borgne |
| **Profondeur logement** | 12.5 mm (+0.5mm) | Standard |
| **Diametre boulon** | 5, 7 ou 8 mm | Selon modele |
| **Distance bord-centre** | 24 ou 34 mm | Selon boulon |

### 4.2 Epaisseur Minimale Panneau

| Profondeur Percage | Epaisseur Mini |
|-------------------|----------------|
| 12.5 mm | 16 mm |
| 14.0 mm | 19 mm |
| 16.0 mm | 19 mm |

---

## 5. Vis Confirmat (Euroscrew)

### 5.1 Specifications Percage

| Vis | Avant-trou Face | Avant-trou Chant | Fraisure |
|-----|-----------------|------------------|----------|
| 5×50 mm | 5 mm | 5 mm | 8 mm |
| 7×50 mm | 5 mm | 5 mm | 8 mm |
| 7×70 mm | 5 mm | 5 mm | 8 mm |

### 5.2 Profondeur Percage

```
profondeur_percage = longueur_vis - 5mm
```

---

## 6. Tourillons (Dowels)

### 6.1 Specifications Standard

| Diametre Tourillon | Diametre Percage | Profondeur | Espacement |
|-------------------|------------------|------------|------------|
| 6 mm | 6 mm | 25 mm | 32 mm (System 32) |
| 8 mm | 8 mm | 30 mm | 32 ou 64 mm |
| 10 mm | 10 mm | 35 mm | 64 mm |

---

## 7. Rainures pour Fond

### 7.1 Types de Fond

| Type | Description | Position |
|------|-------------|----------|
| **Applique** | Fond visse sur l'arriere | Derriere les cotes |
| **Rainure** | Fond dans rainure | 10-15mm du bord arriere |
| **Encastre** | Fond dans feuillure | Affleurant avec l'arriere |

### 7.2 Specifications Rainure

| Epaisseur Fond | Largeur Rainure | Profondeur Rainure |
|----------------|-----------------|-------------------|
| 3 mm (HDF) | 4 mm | 8-10 mm |
| 5 mm (CP) | 6 mm | 10 mm |
| 8 mm (MDF) | 9 mm | 10-12 mm |

### 7.3 Position Rainure

```
distance_rainure_bord = epaisseur_fond + 5mm
```

Typiquement 10-15mm du bord arriere des cotes.

---

## 8. Dimensions Standard Caissons

### 8.1 Caissons Bas (Cuisine)

| Parametre | Valeur Standard |
|-----------|-----------------|
| **Hauteur totale** | 720 mm |
| **Hauteur hors plinthe** | 780-810 mm |
| **Profondeur** | 560-580 mm |
| **Epaisseur structure** | 18 mm |
| **Epaisseur fond** | 3-8 mm |

### 8.2 Caissons Hauts

| Parametre | Valeur Standard |
|-----------|-----------------|
| **Hauteur** | 700-900 mm |
| **Profondeur** | 300-350 mm |
| **Epaisseur structure** | 18 mm |

### 8.3 Colonnes

| Parametre | Valeur Standard |
|-----------|-----------------|
| **Hauteur** | 2000-2200 mm |
| **Profondeur** | 560-580 mm |
| **Epaisseur structure** | 18 mm |

---

## 9. Tolerances

| Element | Tolerance |
|---------|-----------|
| Position percage | ± 0.5 mm |
| Diametre percage | ± 0.2 mm |
| Profondeur percage | + 0.5 mm / -0 mm |
| Dimensions panneaux | ± 0.5 mm |
| Equerrage | ≤ 1mm/m |

---

## 10. Export Formats

### 10.1 DXF (Drawing Exchange Format)

Format standard pour:
- Plans de decoupe
- Positions de percage
- Import CNC

**Layers recommandes:**
- `CONTOUR` - Contours de decoupe
- `DRILLING_5MM` - Percages 5mm
- `DRILLING_8MM` - Percages 8mm
- `DRILLING_15MM` - Percages 15mm
- `DRILLING_35MM` - Percages 35mm (cups charnieres)
- `RAINURE` - Rainures
- `ANNOTATIONS` - Cotations et textes

### 10.2 CSV Cut List

Format pour liste de debit:
```csv
Reference,Designation,Longueur,Largeur,Epaisseur,Quantite,Materiau,Chants_L1,Chants_L2,Chants_l1,Chants_l2
CTG,Cote Gauche,720,560,18,1,Melamine,ABS,ABS,-,-
```

---

## References Complementaires

### Logiciels Open Source

1. **dprojects/Woodworking** (FreeCAD)
   - GitHub: https://github.com/dprojects/Woodworking
   - magicDriller pour percages System 32
   - Export DXF integre

2. **PolyBoard** (Freemium)
   - https://wooddesigner.org/
   - Export DXF/CNC
   - Cut list automatique

### Documentation Fabricants

- [Blum Catalogue](https://publications.blum.com/)
- [Hafele Specifications](https://www.hafele.com/)
- [Hettich TechDoc](https://www.hettich.com/)

---

*Document genere pour CutX Platform - Base sur standards industriels 2024-2025*
