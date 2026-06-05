document.addEventListener("DOMContentLoaded", () => {
	const buttons = document.getElementsByTagName("button");
	[...document.getElementsByTagName("footer")[0].getElementsByTagName("button")].forEach(p => {
		p.addEventListener("click", switchPage);
	});
	buttons["erase"].addEventListener("click", erase);
	buttons["add"].addEventListener("click", idsManager.add);
	// Calculator
	buttons["calculate-total"].addEventListener("click", calculateTotal);
	// Holds Calculator
	document.getElementById("amount").addEventListener("focusout", holdsAmountChange);
	buttons["calculate-hold"].addEventListener("click", calculateHolds);
	// Options
	buttons["load-employees"].addEventListener("click", employeeManager.load);
	buttons["export-employees"].addEventListener("click", employeeManager.export);
	buttons["load-links"].addEventListener("click", linksManager.load);
	buttons["export-links"].addEventListener("click", linksManager.export);
	buttons["load-ids"].addEventListener("click", idsManager.load);
	buttons["export-ids"].addEventListener("click", idsManager.export);
	buttons["theme-switcher"].addEventListener("click", toggleDarkMode);
	buttons["apply-font-changes"].addEventListener("click", applyFontChanges);
	

	document.getElementById("font-size-slider").addEventListener("input", fontPreview);
	document.getElementById("font-size-slider").previousElementSibling.addEventListener("input", fontPreview);

	populateEmployees();
	populateLinks();
	populateIDs();
});

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
			links = links.filter(l.link !== link);
			links.push({name, link});
		},
		remove(link) {
			links = links.filter(l.link !== link);
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
		}
	}
})();

function populateLinks() {
	const linksGrid = document.getElementById("links-grid");
	for (const link of linksManager) {
		const image = document.createElement("img");
		image.addEventListener("error", e => {
			e.target.src = SVGMaker(link.name);
		});
		if (link.image) image.src = link.image;
		else image.src = `sidebarImages/${link.name}`;
		image.alt = `Link to ${link.name}`;
		const span = document.createElement("span");
		span.innerText = link.name;
		const anchor = document.createElement("a");
		anchor.href = link.link;
		anchor.target = "_blank";
		anchor.append(image, span);		
		linksGrid.append(anchor);
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

function fontPreview(e) {
	const slider = document.getElementById("font-size-slider");
	const counter = slider.previousElementSibling;
	let newValue = slider.value;
	if (e.target === counter) newValue = counter.value;
	const preview = document.getElementById("sample-text");
	if (e.target === slider) counter.value = Number(slider.value).toFixed(2);
	else slider.value = Number(counter.value).toFixed(2);
	preview.style.fontSize = `${slider.value}em`;
}

function applyFontChanges() {
	document.documentElement.style.setProperty("--font-size", document.getElementById("font-size-slider").value + "em");
}
