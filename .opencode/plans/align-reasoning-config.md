# Aligner la config reasoning effort (plan: high / build: low)

## Objectif

Rendre la config opencode cohérente et réfléchie : le mode plan doit raisonner
davantage (qualité du plan), le mode build doit rester rapide (boucles itératives).
Aucun usage du champ `variant` — on reste sur `options.reasoningEffort`.

## Fichier cible

`~/.config/opencode/opencode.jsonc` (config globale opencode, hors projet)

## Changements (2 lignes modifiées)

### 1. Agent `plan` — passer le raisonnement de `low` à `high`

Avant :
```jsonc
"plan": {
  "description": "Analyzes code and produces a plan without making any changes (read-only, high reasoning effort).",
  "model": "opencode/deepseek-v4-flash-free",
  "options": { "reasoningEffort": "low" },
  ...
```

Après :
```jsonc
"plan": {
  "description": "Analyzes code and produces a plan without making any changes (read-only, high reasoning effort).",
  "model": "opencode/deepseek-v4-flash-free",
  "options": { "reasoningEffort": "high" },
  ...
```

→ Seule la valeur `"low"` → `"high"` change. La description disait déjà
"high reasoning effort" : elle devient donc cohérente avec le réglage effectif.

### 2. Agent `build` — inchangé

Garder `options: { "reasoningEffort": "low" }` et la description
"(low reasoning effort for speed)". Déjà cohérent, aucune modification.

## Ce qui ne change PAS

- `$schema`
- `default_agent` (`"plan"`)
- Le modèle (`opencode/deepseek-v4-flash-free`) des deux agents
- Les blocs `permission` (plan : edit deny hors `.opencode/plans/*`, bash deny)
- Aucun champ `variant` ajouté nulle part

## Vérification

1. Relire `~/.config/opencode/opencode.jsonc` et confirmer :
   - `plan.options.reasoningEffort` = `"high"`
   - `build.options.reasoningEffort` = `"low"`
   - zéro occurrence de `variant`
2. La description de `plan` ("high reasoning effort") correspond au réglage.
3. **Redémarrer opencode** — la config est chargée une seule fois au démarrage,
   une session existante garde l'ancienne config.

## Note

`reasoningEffort` est envoyé sur **chaque** requête de l'agent concerné (pas de
dispatch "seulement si nécessaire"). Impact acceptable : les sessions plan sont
rares, le modèle est free, et `high` est un plafond — les questions triviales
restent traitées rapidement.