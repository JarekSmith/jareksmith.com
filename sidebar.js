document.addEventListener("DOMContentLoaded", () => {
	const elementEventCallback = [
		["erase", "click", erase],
		["add", "click", idsManager.add],
		["calculate-total", "click", calculateTotal],
		["amount", "focusout", holdsAmountChange],
		["calculate-hold", "click", calculateHolds],
		["load-employees", "click", employeeManager.load],
		["export-employees", "click", employeeManager.export],
		["load-links", "click", linksManager.load],
		["export-links", "click", linksManager.export],
		["load-ids", "click", idsManager.load],
		["export-ids", "click", idsManager.export],
		["theme-switcher", "click", toggleDarkMode],
		["apply-font-changes", "click", applyFontChanges],
		["cancel-link", "click", () => {
			document.getElementById("add-link-popup").classList.add("hidden");
			[...document.getElementById("add-link-popup")
						.getElementsByTagName("input")
					   ].forEach(el=>el.value="");
		}],
		["create-link", "click", addLink]
	];
	elementEventCallback.forEach(([id, event, callback]) => {
		document.getElementById(id).addEventListener(event, callback);
	});
	[...document.getElementsByTagName("footer")[0]
		.getElementsByTagName("button")
	   ].forEach(b => b.addEventListener("click", switchPage));
	getPages("options-page").getElementsByTagName("input")[0]
							.addEventListener("input", fontPreview);
	populateEmployees();
	populateLinks();
	populateIDs();
});

function addButtonEventListener(id, event, callback) {
	const buttons = document.getElementsByTagName("button");
	buttons[id].addEventListener(event, callback);
}

function getPages(id) {
	const pages = document.getElementsByClassName("page");
	if (id) return pages[id];
	return [...pages];
}

const format = new Intl.NumberFormat("en-US", {
	style: 'currency',
	currency: 'USD'

}).format

function calculateTotal(e) {
	const button = e.target;
	const textArea = document.getElementById("calculator-textarea");
	const output = button.nextElementSibling;
	const numbers = textArea.value.split("\n").map(line => Number(line)).filter(number => !isNaN(number));
	output.innerText = `Total: ${format(numbers.reduce((prev, curr) => prev + curr))}`;
}

async function calculateHolds() {
	const holdsList = document.getElementById("holds-list").getElementsByTagName("tbody")[0];
	const isExtended = document.getElementById("extended").checked;
	const amount = Number(document.getElementById("amount").value) ?? 0;
	if (amount < 275) return;

	async function calculateExpiration(days) {
		const date = new Date().toLocaleDateString("en-CA");
		let data = undefined;
		try {
			const URL = `https://fincalapi.com/v1/settlement_date?date=${date}&calendar=SIFMA-US&tplus=${days}`;
			data = await (await fetch(URL)).json()
			data = data["settlement_date"]
		} catch (e) {
			console.error(e);
		}
		return data;
	}
	function createTD(text) {
		const el = document.createElement("td");
		el.innerText = text;
		return el;
	}
	holdsList.innerHTML = "";
	const row = document.createElement("tr");
	if (isExtended && amount >= 6725) {
		row.append(createTD("A"), createTD("$6,450"), createTD(await calculateExpiration(2)));
		holdsList.append(row);
		const newRow = document.createElement("tr");
		newRow.append(createTD("E"), createTD(format(amount-6725)), createTD(await calculateExpiration(7)));
		holdsList.append(newRow);
	} else {
		row.append(createTD("A"), createTD(format(amount-275)), createTD(await calculateExpiration(2)));
		holdsList.append(row);
	}
}

function holdsAmountChange(e) {
	const amountInput = e.target;
	if (isNaN(Number(amountInput.value))) return;
	amountInput.value = Number(amountInput.value).toFixed(2);
}

function erase() {
	document.getElementsByTagName("textarea")[0].value = "";
}

const idsManager = (() => {
	let ids = JSON.parse(localStorage.getItem("ids") ?? "[]");
	const notes = () => document.getElementsByTagName("textarea")[0];
	function save() {
		localStorage.setItem("ids", JSON.stringify(ids));
	};
	return {
		add() {
			const name = prompt("Enter a name");
			if (!name) return;
			ids = ids.filter(id => id.name !== name);
			ids.push({name, text: notes().value ?? ""});
			save();
			populateIDs();
		},
		select(name) {
			if (ids.some(id => id.name === name)) notes().value = ids.filter(id => id.name === name)[0].text;
		},
		async load() {
			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = ".json";
			fileInput.addEventListener("change", async e => {
				const file = e.target.files[0];
				try {
					ids = JSON.parse(await file.text());
					save();
					populateIDs();
				} catch (e) {
					console.error(error);
				}
			})
			fileInput.click();
		},
		export() {
			downloadJSON("ids", ids);
		},
		remove(name) {
			ids = ids.filter(id => id.name !== name);
			save();
			populateIDs();
		},
		[Symbol.iterator]() {
			let index = 0;
			return {
				next() {
					if (index >= ids.length) return {done: true};
					return {value: ids[index++], done: false};
				}
			}
		}
	}
})();

function populateIDs() {
	const idList = document.getElementById("id-list");
	idList.innerHTML = "";
	for (const id of idsManager) {
		const option = document.createElement("div");
		option.classList.add("id-option");
		option.innerText = id.name;
		option.addEventListener("click", () => idsManager.select(id.name));
		option.addEventListener("contextmenu", (e) => {e.preventDefault(); idsManager.remove(id.name);});
		idList.append(option);
	}
}

function downloadJSON(filename, object) {
	let text = JSON.stringify(object);
	let element = document.createElement("a");
	element.href = "data:application/json;charset=utf-8, " + encodeURIComponent(text);
	element.download = filename;
	element.click();
}

const employeeManager = (() => {
	let employees = JSON.parse(localStorage.getItem('employees') ?? "[]");
	function save() {
		localStorage.setItem('employees', JSON.stringify(employees));
	}
	return {
		/**
		 * Adds an employee or updates an employee with an identical number
		 */
		add(name, number) {
			number = number.toLowerCase();
			employees = employees.filter(e => e.number!==number);
			employees.push({name, number});
			save();
		},
		/**
		 * Removes an employee using their number (full string, including starting character)
		 */
		remove(number) {
			number = number.toLowerCase();
			employees = employees.filter(e => e.number!==number);
			save();
		},
		async load() {
			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = ".json";
			fileInput.addEventListener("change", async e => {
				const file = e.target.files[0];
				try {
					employees = JSON.parse(await file.text());
					save();
					populateEmployees();
				} catch (e) {
					console.error(e);
				}				
			});
			fileInput.click();
		},
		export() {
			downloadJSON("employees", employees);
		},
		entries() {
			return employees;
		},
		[Symbol.iterator]() {
			let index = 0;
			return {
				next() {
					return {value: employees[index++] ?? null, done: index-1 >= employees.length};
				}
			}
		}
	}
})();

function populateEmployees() {
	const table = document.getElementById("employees-table").getElementsByTagName("tbody")[0];
	table.innerHTML = "";
	for (const employee of employeeManager) {
		const row = document.createElement("tr");
		if (employee.color) row.style.color = employee.color;
		Object.keys(employee).forEach(key => {
			if (key==="color") return;
			const data = document.createElement("td");
			data.innerText = employee[key];
			row.append(data);
		})
		table.append(row);
	}
}

const linksManager = (() => {
	let links = JSON.parse(localStorage.getItem("links") ?? "[]");
	function save() {
		localStorage.setItem("links", JSON.stringify(links));
	};
	return {
		add(name, link) {
			links = links.filter(l => l.link !== link);
			links.push({name, link});
			save()
		},
		remove(link) {
			links = links.filter(l => l.link !== link);
			save();
		},
		toArray() {
			return links;
		},
		[Symbol.iterator]() {
			let index = 0;
			return {
				next() {
					if (index >= links.length) return {done: true};
					return {value: links[index++], done: false};
				}
			}
		},
		async load() {
			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = ".json";
			fileInput.addEventListener("change", async e => {
				const file = e.target.files[0];
				try {
					links = JSON.parse(await file.text());
					save();
					populateLinks();
				} catch (e) {
					console.error(e);
				}
			});
			fileInput.click();
		},
		export() {
			downloadJSON("links", links);
		},
		createLink(name, link, image) {
			const img = Object.assign(document.createElement("img"), {src: image ?? SVGMaker(name)});
			const span = Object.assign(document.createElement("span"), {innerText: name});
			const linkEl = Object.assign(document.createElement("a"), {href: link, target: "_blank"});
			linkEl.append(img, span);
			linkEl.addEventListener("contextmenu", e => {
				e.preventDefault();
				linksManager.remove(link);
				imageHandler.remove(name);
				populateLinks();
			})
			return linkEl;
		}
	}
})();

function populateLinks() {
	const linksGrid = document.getElementById("links-grid");
	linksGrid.innerHTML = "";
	for (const link of linksManager) {	
		linksGrid.append(linksManager.createLink(link.name, link.link, imageHandler.get(link.name)));
	}
	const addLinkButton = document.createElement("a");
	const svg = `
	<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
		<defs>
			<mask id="Mask">
				<rect width="100" height="100" fill="white" />
				<line x1="50" y1="10" x2="50" y2="90" style="stroke:black;stroke-width:10px" />
				<line x1="10" y1="50" x2="90" y2="50" style="stroke:black;stroke-width:10px" />
			</mask>
		</defs>
		<rect width="100" height="100" fill="blue" mask="url(#Mask)"/>
	</svg>
	`;
	const img = Object.assign(document.createElement("img"), {src: `data:image/svg+xml,${encodeURIComponent(svg)}`});

	addLinkButton.append(img, Object.assign(document.createElement("span"),{innerText:"New..."}));
	addLinkButton.addEventListener("click", async () => {
		document.getElementById("add-link-popup").classList.remove("hidden");
	})
	linksGrid.append(addLinkButton);
}

function addLink() {
	const linkPopup = document.getElementById("add-link-popup");
	const [nameEl, linkEl, fileEl] = linkPopup.getElementsByTagName("input");
	if (nameEl.value && linkEl.value && fileEl.files[0]) {
		linksManager.add(nameEl.value, linkEl.value);
		imageHandler.addFromImage(fileEl.files[0], nameEl.value);
		linkPopup.classList.add("hidden");
		populateLinks();
	}
} 

function SVGMaker(name) {
	const initials = name.split(" ").map(w => w[0].toUpperCase()).join("");
	const [backColor, textColor] = [
		["blue", "white"],
		["red", "white"],
		["yellow", "black"],
		["black", "white"],
		["white", "black"],
		["green", "white"],
		["pink", "black"]
	][Math.floor(Math.random()*7)];
	const svg = 
	`<svg xmlns='http://www.w3.org/2000/svg' width="100" height="100">
	<rect width="100" height="100" fill="${backColor}" />
	<text font-size="2em" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="${textColor}">${initials}</text>
	</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function toggleDarkMode(e) {
	const button = e.currentTarget;
	const darkMode = {
		name: "Dark Mode",
		next: "Light Mode",
		backgroundColor: "black",
		fontColor: "white",
		textAreaColor: "gray"
	};
	const lightMode = {
		name: "Light Mode",
		next: "Dark Mode",
		backgroundColor: "white",
		fontColor: "black",
		textAreaColor: "white"
	}
	let theme = lightMode;
	if (button.innerText === "Dark Mode") theme = darkMode;
	function setRootProps(propPairs) {
		for (const prop of propPairs) {
			document.documentElement.style.setProperty(prop[0], prop[1]);
		}
	}
	setRootProps([
		["--background-color", theme.backgroundColor],
		["--font-color", theme.fontColor],
		["--textarea-color", theme.textAreaColor]
	]);
	button.innerText = theme.next;
}

function switchPage(e) {
	const button = e.target;
	let pageName = "";
	switch (button.innerText) {
		case "Notes":
			pageName="notes-page";
			break;
		case "Calculator":
			pageName="calc-page";
			break;
		case "Holds":
			pageName="holds-page";
			break;
		case "Options":
			pageName="options-page";
			break;
	}
	[...document.getElementsByClassName("page")].forEach(p => {
		if (p.id===pageName) p.classList.remove("hidden");
		else p.classList.add("hidden");
	});
}

function fontPreview() {
	const optionsPage = document.getElementById("options-page");
	const counter = optionsPage.getElementsByTagName("input")[0];
	const preview = document.getElementById("sample-text");
	preview.style.fontSize = `${counter.value}em`;
}

function applyFontChanges() {
	document.documentElement.style.setProperty("--font-size", getPages("options-page").getElementsByTagName("input")[0].value + "em");
}

const imageHandler = (() => {
	let images = JSON.parse(localStorage.getItem('images') ?? "[]");
	function save(){
		localStorage.setItem('images', JSON.stringify(images));
	}
	/**
	 * Prompts the user to upload an image and returns the File
	 * @returns {Promise<File>}
	 */
	async function getImage() {
		return new Promise((resolve, reject) => {
			const fileInput = Object.assign(document.createElement("input"), {type: "file", accept: "image/*"});
			fileInput.addEventListener("change", e => {
				const file = e.target.files[0];
				if (file) resolve(file);
				else reject("Image not uploaded");
			});
			fileInput.click();
		});			
	}
	/**
	 * Converts a png to a URI that can be stored in localStorage
	 * @param {File} image 
	 * @returns {Promise<string>}
	 */
	async function imageToURI(image) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject("Couldn't load file as URL");
			reader.readAsDataURL(image);
		})
	}
	return {
		async add(name) {
			const image = await getImage().then(img => imageToURI(img), reason => {
				console.error(reason);
				return null;
			});
			if (!image) return;
			images.push({name, image});
			save();
			populateLinks();
		},
		async addFromImage(img, name) {
			console.log(img);
			const image = await imageToURI(img);
			if (!image) {console.log("FAILED"); return;}
			images.push({name, image});
			save();
			populateLinks();
		},
		remove(name) {
			images = images.filter(image => image.name !== name);
			save();
			populateLinks();
		},
		get(name) {
			for (const image of images) {
				if (image.name === name) return image.image;
			}
			return null;
		}
	}
})();