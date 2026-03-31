// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const loadImagesBtn = document.getElementById('loadImagesBtn');
const gallery = document.getElementById('gallery');
const spaceFactText = document.getElementById('spaceFactText');
const imageModal = document.getElementById('imageModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

let currentGalleryItems = [];

// A short list of fun facts for beginners.
const spaceFacts = [
	'A day on Venus is longer than a year on Venus.',
	'Neutron stars can spin hundreds of times every second.',
	'One million Earths could fit inside the Sun.',
	'Saturn could float in water because it is mostly gas.',
	'Light from the Sun takes about 8 minutes to reach Earth.'
];

// NASA provides a demo key for beginner projects.
// To use your own key, visit https://api.nasa.gov/ and then either:
// 1) replace fallbackApiKey below, or
// 2) open the app with ?api_key=YOUR_KEY (it is saved in localStorage).
const fallbackApiKey = 'bAYYYzljF2RhWPbfkDq49PdUgHhgJJMp2fz1q7VZ';

function getApiKey() {
	const params = new URLSearchParams(window.location.search);
	const keyFromUrl = params.get('api_key');
	const keyFromStorage = window.localStorage.getItem('NASA_API_KEY');

	if (keyFromUrl) {
		window.localStorage.setItem('NASA_API_KEY', keyFromUrl);
		return keyFromUrl;
	}

	return keyFromStorage || fallbackApiKey;
}

const apiKey = getApiKey();

function renderRandomSpaceFact() {
	if (!spaceFactText) {
		return;
	}

	const randomIndex = Math.floor(Math.random() * spaceFacts.length);
	spaceFactText.textContent = spaceFacts[randomIndex];
}

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);
renderRandomSpaceFact();

// Build the APOD API URL using the selected start and end dates.
function buildApodUrl(startDate, endDate) {
	return `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}`;
}

// Render APOD items in the gallery.
function renderGallery(apodItems) {
	// APOD returns an array for date ranges, but can return a single object in other cases.
	const items = Array.isArray(apodItems) ? apodItems : [apodItems];

	// NASA sometimes returns items from oldest to newest,
	// so we reverse to show the newest first.
	const sortedItems = [...items].reverse();

	// Keep only actual images and skip videos.
	const imageItems = sortedItems.filter((item) => item.media_type === 'image');
	currentGalleryItems = imageItems;

	if (imageItems.length === 0) {
		gallery.innerHTML = '<p>No space images were found in this date range. Try a different range.</p>';
		return;
	}

	const cardsHtml = imageItems.map((item, index) => {
		return `
			<article class="gallery-item" data-index="${index}" tabindex="0">
				<img src="${item.url}" alt="${item.title}" loading="lazy" />
				<h2>${item.title}</h2>
				<p class="date">${item.date}</p>
			</article>
		`;
	}).join('');

	gallery.innerHTML = cardsHtml;
}

function openModal(item) {
	modalImage.src = item.hdurl || item.url;
	modalImage.alt = item.title;
	modalTitle.textContent = item.title;
	modalDate.textContent = item.date;
	modalExplanation.textContent = item.explanation;

	imageModal.classList.remove('hidden');
	imageModal.setAttribute('aria-hidden', 'false');
	document.body.classList.add('no-scroll');
}

function closeModal() {
	imageModal.classList.add('hidden');
	imageModal.setAttribute('aria-hidden', 'true');
	document.body.classList.remove('no-scroll');
}

function renderLoadingState() {
	gallery.innerHTML = '<p class="loading-message">browsing through space</p>';
}

function renderErrorState(message) {
	gallery.innerHTML = `<p>${message}</p>`;
}

function getHelpfulErrorMessage(message) {
	const lowerMessage = message.toLowerCase();

	if (window.location.protocol === 'file:') {
		return 'This page is running from a local file. Start it with Live Server (http://localhost) and try again.';
	}

	if (
		lowerMessage.includes('api_key') ||
		lowerMessage.includes('rate limit') ||
		lowerMessage.includes('demo_key') ||
		lowerMessage.includes('forbidden')
	) {
		return 'NASA rejected the API key. Add your own key from https://api.nasa.gov/ by opening this app with ?api_key=YOUR_KEY, then try again.';
	}

	return `NASA connection error: ${message}`;
}

// Fetch APOD data for the selected date range.
async function loadApodByDateRange() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		gallery.innerHTML = '<p>Please choose both a start and end date.</p>';
		return;
	}

	if (startDate > endDate) {
		gallery.innerHTML = '<p>Start date must be on or before end date.</p>';
		return;
	}

	try {
		renderLoadingState();

		const url = buildApodUrl(startDate, endDate);
		const response = await fetch(url);

		if (!response.ok) {
			let nasaMessage = `NASA request failed with status ${response.status}.`;

			try {
				const errorData = await response.json();
				if (errorData.error?.message) {
					nasaMessage = errorData.error.message;
				}
			} catch (jsonError) {
				// Keep the default status message when NASA does not return JSON.
			}

			throw new Error(nasaMessage);
		}

		const apodItems = await response.json();
		renderGallery(apodItems);
	} catch (error) {
		console.error('APOD fetch error:', error);
		renderErrorState(getHelpfulErrorMessage(error.message));
	}
}

// Run the API request when the button is clicked.
loadImagesBtn.addEventListener('click', loadApodByDateRange);

// Open the modal when a gallery card is clicked.
gallery.addEventListener('click', (event) => {
	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	const index = Number(card.dataset.index);
	const item = currentGalleryItems[index];

	if (!item) {
		return;
	}

	openModal(item);
});

// Keyboard support: open modal with Enter when card is focused.
gallery.addEventListener('keydown', (event) => {
	if (event.key !== 'Enter') {
		return;
	}

	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	const index = Number(card.dataset.index);
	const item = currentGalleryItems[index];

	if (!item) {
		return;
	}

	openModal(item);
});

// Close modal with close button.
closeModalBtn.addEventListener('click', closeModal);

// Close modal when clicking outside content.
imageModal.addEventListener('click', (event) => {
	if (event.target.dataset.closeModal === 'true') {
		closeModal();
	}
});

// Close modal with Escape key.
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !imageModal.classList.contains('hidden')) {
		closeModal();
	}
});
