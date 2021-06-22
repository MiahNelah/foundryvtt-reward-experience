'use strict';
export class CombatManager {
    constructor() {
        this.MODULE_ID = "foundryvtt-reward-experience";
        this.MODULE_NAME = "Reward Experience";
        this.LEVELUP_CARD_TEMPLATE = "levelup-card";
        this.REWARD_EXPERIENCE_CARD_TEMPLATE = "reward-experience-card";
        this.TEMPLATES_EXTENSION = "hbs";
        this.TEMPLATES_PATH = `/modules/${MODULE_ID}/templates`;
    }

    static _onEndCombat(combatData) {
        if (!game.user.isGM) return;

        if (combatData === undefined) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-active-combat"));
            return;
        }

        const monsters = combatData.data.combatants.filter(x => x.actor.data.type === "npc");
        if (!monsters || monsters.length === 0) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-monsters-in-combat"));
            return;
        }

        const totalExperience = monsters.map(x => x.actor.data.data.details.xp.value).reduce((a, b) => a + b);
        // If monsters give no experience, we won't go further
        if (totalExperience === 0) return;


        const players = combatData.data.combatants.filter(x => x.actor.data.type === "character");
        if (!players || players.length === 0) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-players-in-combat"));
            return;
        }

        const characterExperience = Math.floor(totalExperience / players.length);
        // If monsters give so fex experience that rounded per charecter is 0, we won't go further
        if (characterExperience === 0) return;


        players.forEach(player => {
            // Getting some player's experience data
            const playerExperienceData = player.actor.data.data.details.xp;
            const currentExperience = playerExperienceData.value;
            const experienceRequiredToLevelUp = playerExperienceData.max;

            // Doing some high-level maths
            const newExperienceValue = currentExperience + characterExperience;

            // We apply experience gain to player
            player.actor.update({
                data: {
                    details: {
                        xp: {
                            value: newExperienceValue
                        }
                    }
                }
            });

            // We send a whisper to player with experience earned.
            // If player can level up, another whisper is send as warning.
            this._notifyExperienceReward(player, characterExperience).then(() => {
                const doLevelup = newExperienceValue >= experienceRequiredToLevelUp;
                if (doLevelup) {
                    this._notifyLevelUp(player);
                }
            });
        });
    }

    /**
     * Loads templates based on module's configuration.
     *
     * @param {string} templateName     The name of the target HTML template
     * @param {Object} data             A data object against which to compile the template
     *
     * @return {Promise<Object>}        Returns the rendered HTML
     */
    async loadTemplate(templateName, data) {
        return renderTemplate(`${TEMPLATES_PATH}/${templateName}.${TEMPLATES_EXTENSION}`, data)
    }

    /**
     * Send a notification to user with experience amoutn earned.
     *
     * @param {Object} user               User to give experience points
     * @param {number} experienceAmount   Amount of experience points granted to user
     *
     * @return {Promise}
     */
    async notifyExperienceReward(user, experienceAmount) {
        return renderTemplate(`${this.TEMPLATES_PATH}/${this.REWARD_EXPERIENCE_CARD_TEMPLATE}.${this.TEMPLATES_EXTENSION}`, {
            experience: experienceAmount
        }).then(content => {
            ChatMessage.create({
                type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                user: game.user.id,
                speaker: undefined,
                whisper: [user.id],
                content: content
            });
        });
    }

    /**
     * Send a notification to user with experience amoutn earned.
     *
     * @param {Object} user             User to notify of level up
     *
     * @return {Promise}
     */
    async notifyLevelUp(user) {
        return renderTemplate(`${this.TEMPLATES_PATH}/${this.LEVELUP_CARD_TEMPLATE}.${this.TEMPLATES_EXTENSION}`, {
            experience: experienceAmount
        }).then(content => {
            ChatMessage.create({
                type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                user: game.user.id,
                speaker: undefined,
                whisper: [user.id],
                content: content
            });
        });
    }
}