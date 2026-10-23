const THIS_MODULE_ID = "agrupador-t20"; // precisa bater com o "id" no module.json
const MAGIAS_MOD_ID = THIS_MODULE_ID; // scope válido: precisa ser um módulo ativo
const MAGIAS_MOD_ID_ANTIGO = "agrupador-magias-t20"; // scope usado pelo módulo antigo (não é mais válido, só usado para migrar dados)
const PODERES_FLAG_SCOPE = "tormenta20"; // mantido: é o id do sistema, continua sempre válido

/**
 * Migração única: o módulo antigo "agrupador-magias-t20" guardava as pastas
 * de magia sob esse id como flag scope. Como esse módulo não existe mais
 * (virou "agrupador-t20"), o Foundry rejeita getFlag/setFlag com o scope
 * antigo ("Flag scope ... is not valid or not currently active"). Só que os
 * dados continuam salvos ali, então lemos direto do objeto bruto de flags
 * (isso não passa pela validação de scope) e copiamos para o scope novo.
 */
async function migrarFlagsAntigasDeMagia() {
	if (!game.user.isGM) return; // só o GM tem permissão de atualizar qualquer ator
	for (const actor of game.actors) {
		const dadosAntigos = actor.flags?.[MAGIAS_MOD_ID_ANTIGO];
		if (!dadosAntigos) continue;
		if (actor.flags?.[THIS_MODULE_ID]?.spellFolders) continue; // já migrado

		console.log(`Agrupador de Magias | Migrando dados antigos do ator "${actor.name}"...`);
		try {
			await actor.update({
				[`flags.${THIS_MODULE_ID}.spellFolders`]: dadosAntigos.spellFolders ?? [],
				[`flags.${THIS_MODULE_ID}.useSpellFolders`]: dadosAntigos.useSpellFolders ?? false,
				[`flags.-=${MAGIAS_MOD_ID_ANTIGO}`]: null
			});
		} catch (e) {
			console.error(`Agrupador de Magias | Falha ao migrar dados do ator "${actor.name}":`, e);
		}
	}
}

Hooks.once("ready", () => {
	migrarFlagsAntigasDeMagia();
});

let cachedSpellTemplateContent = null;
let cachedPowerTemplateContent = null;

const loadSpellTemplate = async () => {
	const module = game.modules.get(THIS_MODULE_ID);
	if (!module) {
		console.error("Agrupador de Magias | Módulo não encontrado!");
		return;
	}
	const templatePath = `modules/${module.id}/templates/actor/parts/lists/list-spells-folders.hbs`;

	try {
		const response = await fetch(templatePath);
		if (response.ok) {
			cachedSpellTemplateContent = await response.text();
			console.log("Agrupador de Magias | Template carregado com sucesso.");
		} else {
			console.error("Agrupador de Magias | Falha ao carregar arquivo de template:", templatePath);
		}
	} catch (e) {
		console.error("Agrupador de Magias | Erro no fetch do template:", e);
	}
};

const loadPowerTemplate = async () => {
	const module = game.modules.get(THIS_MODULE_ID);
	if (!module) {
		console.error("Agrupador de Poderes | Módulo não encontrado!");
		return;
	}
	const templatePath = `modules/${module.id}/templates/actor/parts/lists/list-powers-folders.hbs`;

	try {
		const response = await fetch(templatePath);
		if (response.ok) {
			cachedPowerTemplateContent = await response.text();
			console.log("Agrupador de Poderes | Template carregado com sucesso.");
		} else {
			console.error("Agrupador de Poderes | Falha ao carregar arquivo de template:", templatePath);
		}
	} catch (e) {
		console.error("Agrupador de Poderes | Erro no fetch do template:", e);
	}
};

// CORREÇÃO: nas versões originais isso era chamado direto no topo do
// arquivo (fora de qualquer hook), antes de "game.modules" existir —
// causando "Cannot read properties of undefined (reading 'get')".
// Agora só roda a partir do hook "init", quando game.modules já existe.
Hooks.once("init", () => {
	loadSpellTemplate();
	loadPowerTemplate();
});

Hooks.on("getActorSheetData", (app, sheetData) => {
	const actor = app.document || app.actor;
	if (!actor || (actor.type !== "character" && actor.type !== "npc")) return;

	if (window.SpellFolderManager) {
		window.SpellFolderManager.prepareActorData(actor, sheetData);
		sheetData.useSpellFolders = actor.getFlag(MAGIAS_MOD_ID, "useSpellFolders") || false;
	}

	if (window.PowerFolderManager) {
		window.PowerFolderManager.prepareActorData(actor, sheetData);
		sheetData.usePowerFolders = actor.getFlag(PODERES_FLAG_SCOPE, "usePowerFolders") || false;
	}
});

Hooks.on("renderActorSheet", async (app, html, data) => {
	const actor = app.document || app.actor;
	if (!actor || (actor.type !== "character" && actor.type !== "npc")) return;

	const useSpellFolders = actor.getFlag(MAGIAS_MOD_ID, "useSpellFolders") || false;
	const usePowerFolders = actor.getFlag(PODERES_FLAG_SCOPE, "usePowerFolders") || false;

	if (useSpellFolders) {
		let spellsSection = html.find(".tab.spells");
		if (spellsSection.length === 0) spellsSection = html.find(".list-spells");

		if (spellsSection.length > 0) {
			if (!cachedSpellTemplateContent) {
				await loadSpellTemplate();
			}

			if (cachedSpellTemplateContent) {
				try {
					if (window.SpellFolderManager) {
						window.SpellFolderManager.prepareActorData(actor, data);
					}

					const renderedHtml = Handlebars.compile(cachedSpellTemplateContent)(data);
					spellsSection.html(renderedHtml);
					app.activateListeners(spellsSection);
				} catch (err) {
					console.error("Agrupador de Magias | Erro ao compilar template:", err);
				}
			}
		}
	}

	if (usePowerFolders) {
		let powersSection = html.find(".tab.powers");
		if (powersSection.length === 0) powersSection = html.find(".list-powers");

		if (powersSection.length > 0) {
			if (!cachedPowerTemplateContent) {
				await loadPowerTemplate();
			}

			if (cachedPowerTemplateContent) {
				try {
					if (window.PowerFolderManager) {
						window.PowerFolderManager.prepareActorData(actor, data);
					}

					const renderedHtml = Handlebars.compile(cachedPowerTemplateContent)(data);
					powersSection.html(renderedHtml);
					app.activateListeners(powersSection);
				} catch (err) {
					console.error("Agrupador de Poderes | Erro ao compilar template:", err);
				}
			}
		}
	}

	if (window.SpellFolderInjector) {
		window.SpellFolderInjector.injectControls(app, html, actor);
	}
	if (window.PowerFolderInjector) {
		window.PowerFolderInjector.injectControls(app, html, actor);
	}
});
