export default class PowerFolderManager {
	static initializeFolders(actor) {
		if (!actor.getFlag("tormenta20", "powerFolders")) {
			actor.setFlag("tormenta20", "powerFolders", []);
		}
	}

	static getFolders(actor) {
		return actor.getFlag("tormenta20", "powerFolders") || [];
	}

	static async createFolder(actor, name = "Nova Pasta", color = "") {
		const folders = this.getFolders(actor);
		const newFolder = {
			id: foundry.utils.randomID(),
			name: name,
			color: color,
			collapsed: false,
			order: folders.length,
			powers: []
		};
		folders.push(newFolder);
		return actor.setFlag("tormenta20", "powerFolders", folders);
	}

	static async renameFolder(actor, folderId, newName, color) {
		const folders = this.getFolders(actor);
		const folder = folders.find((f) => f.id === folderId);
		if (folder) {
			folder.name = newName;
			if (color !== undefined) folder.color = color;
			return actor.setFlag("tormenta20", "powerFolders", folders);
		}
	}

	static async deleteFolder(actor, folderId) {
		const folders = this.getFolders(actor);
		const folderIndex = folders.findIndex((f) => f.id === folderId);
		if (folderIndex !== -1) {
			folders.splice(folderIndex, 1);
			return actor.setFlag("tormenta20", "powerFolders", folders);
		}
	}

	static async toggleCollapse(actor, folderId) {
		const folders = this.getFolders(actor);
		const folder = folders.find((f) => f.id === folderId);
		if (folder) {
			folder.collapsed = !folder.collapsed;
			return actor.setFlag("tormenta20", "powerFolders", folders);
		}
	}

	static async reorderFolders(actor, sourceId, targetId) {
		const folders = this.getFolders(actor);
		const sourceIndex = folders.findIndex(f => f.id === sourceId);
		const targetIndex = folders.findIndex(f => f.id === targetId);

		if (sourceIndex !== -1 && targetIndex !== -1) {
			const [movedFolder] = folders.splice(sourceIndex, 1);
			folders.splice(targetIndex, 0, movedFolder);
			folders.forEach((f, i) => f.order = i);
			return actor.setFlag("tormenta20", "powerFolders", folders);
		}
	}

	static async addPowerToFolder(actor, folderId, powerId) {
		const folders = this.getFolders(actor);
		folders.forEach((f) => {
			const idx = f.powers.indexOf(powerId);
			if (idx !== -1) f.powers.splice(idx, 1);
		});

		const targetFolder = folders.find((f) => f.id === folderId);
		if (targetFolder && !targetFolder.powers.includes(powerId)) {
			targetFolder.powers.push(powerId);
		}
		return actor.setFlag("tormenta20", "powerFolders", folders);
	}

	static async removePowerFromFolder(actor, folderId, powerId) {
		const folders = this.getFolders(actor);
		const folder = folders.find((f) => f.id === folderId);
		if (folder) {
			const idx = folder.powers.indexOf(powerId);
			if (idx !== -1) {
				folder.powers.splice(idx, 1);
				return actor.setFlag("tormenta20", "powerFolders", folders);
			}
		}
	}

	static prepareActorData(actor, data) {
		const folders = this.getFolders(actor);
		
		let powers = [];
		if (data.actor && data.actor.poderes) {
			powers = data.actor.poderes;
		} else if (actor.items) {
			powers = actor.items.filter(i => i.type === "poder").map(i => i.toObject ? i.toObject() : i);
		} else if (data.items) {
			powers = data.items.filter(i => i.type === "poder");
		}
		
		const organized = {
			folders: [],
			loosePowers: []
		};

		const powerMap = new Map();
		powers.forEach(p => {
			const id = p._id || p.id;
			powerMap.set(id, p);
		});

		folders.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(f => {
			const folderPowers = [];
			f.powers.forEach(pId => {
				if (powerMap.has(pId)) {
					folderPowers.push(powerMap.get(pId));
					powerMap.delete(pId);
				}
			});
			organized.folders.push({ ...f, powers: folderPowers });
		});

		organized.loosePowers = Array.from(powerMap.values());
		
		if (!data.actor) data.actor = {};
		data.actor.powerFolders = organized.folders;
		data.actor.loosePowers = organized.loosePowers;
		data.usePowerFolders = actor.getFlag("tormenta20", "usePowerFolders") || false;
	}

	static async promptCreateFolder(actor) {
		const DialogV2 = foundry.applications?.api?.DialogV2 || Dialog;
		const content = `
			<div class="form-group">
				<label>Nome do Agrupador:</label>
				<input type="text" name="folderName" value="Nova Pasta" autofocus/>
			</div>
			<div class="form-group">
				<label>Cor do Agrupador:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<input type="color" name="folderColor" value="#5c7cfa" style="width: 60px; height: 30px; border:none; background:none;"/>
					<input type="checkbox" name="noColor" id="noColor" style="width: auto;"/>
					<label for="noColor" style="flex: 1; margin: 0;">Sem cor</label>
				</div>
			</div>`;

		return DialogV2.confirm({
			window: { title: "Criar Agrupador" },
			content: content,
			modal: true,
			yes: {
				label: "Criar",
				icon: "fas fa-check",
				callback: async (event, button, dialog) => {
					const html = dialog.element;
					const name = html.querySelector('[name="folderName"]').value;
					const noColor = html.querySelector('[name="noColor"]').checked;
					const color = noColor ? "" : html.querySelector('[name="folderColor"]').value;
					await this.createFolder(actor, name, color);
					return true;
				}
			},
			no: { label: "Cancelar", icon: "fas fa-times" },
			defaultYes: true
		});
	}

	static async promptRenameFolder(actor, folderId, currentName) {
		const DialogV2 = foundry.applications?.api?.DialogV2 || Dialog;
		const folders = this.getFolders(actor);
		const folder = folders.find(f => f.id === folderId);
		const currentColor = folder?.color || "#5c7cfa";

		const content = `
			<div class="form-group">
				<label>Nome do Agrupador:</label>
				<input type="text" name="folderName" value="${currentName}" autofocus/>
			</div>
			<div class="form-group">
				<label>Cor do Agrupador:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<input type="color" name="folderColor" value="${currentColor}" style="width: 60px; height: 30px; border:none; background:none;"/>
					<input type="checkbox" name="noColor" id="noColor" ${!folder?.color ? 'checked' : ''} style="width: auto;"/>
					<label for="noColor" style="flex: 1; margin: 0;">Sem cor</label>
				</div>
			</div>`;

		return DialogV2.confirm({
			window: { title: "Renomear Agrupador" },
			content: content,
			modal: true,
			yes: {
				label: "Salvar",
				icon: "fas fa-save",
				callback: async (event, button, dialog) => {
					const html = dialog.element;
					const name = html.querySelector('[name="folderName"]').value;
					const noColor = html.querySelector('[name="noColor"]').checked;
					const color = noColor ? "" : html.querySelector('[name="folderColor"]').value;
					await this.renameFolder(actor, folderId, name, color);
					return true;
				}
			},
			no: { label: "Cancelar", icon: "fas fa-times" },
			defaultYes: true
		});
	}
}
