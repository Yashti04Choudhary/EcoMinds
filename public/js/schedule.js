document.addEventListener('DOMContentLoaded', () => {
    // DOM element queries
    const itemsTbody = document.getElementById('items-tbody');
    const addItemBtn = document.querySelector('.add-item-btn');
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');
    const submitBtn = document.querySelector('.btn-submit');
    const formSteps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const confirmationDetails = document.getElementById('confirmation-details');
    const form = document.getElementById('schedule-form');
    // Modal elements
    const classifierModal = document.getElementById('classifier-modal');
    const openClassifierBtn = document.querySelector('.use-classifier-btn');
    const closeClassifierBtn = document.getElementById('close-classifier-modal');
    const classifierFileInput = document.getElementById('classifier-file-input');
    const classifierImagePreview = document.getElementById('classifier-image-preview');
    const classifierResult = document.getElementById('classifier-result');
    const classifierConfirmBtn = document.getElementById('classifier-confirm-btn');
    const classifierCancelBtn = document.getElementById('classifier-cancel-btn');

    // --- Make addItemRow available to all handlers ---
    const ITEM_WEIGHT_MAP = {
        phones: 0.2,
        laptops: 2.5,
        batteries: 0.1,
        chargers: 0.15,
        wires: 0.05,
        'circuit boards': 0.3,
        mouse: 0.1,
        keyboard: 0.6
    };

    function addItemRow(item = '', qty = 1) {
        // User-friendly display names for each class label
        const classDisplayNames = {
            CFL_bulbs: 'CFL Bulbs',
            batteries: 'Batteries',
            fan: 'Fan',
            keyboards: 'Keyboards',
            laptop: 'Laptop',
            mobile_phone: 'Mobile Phone',
            motherboard: 'Motherboard',
            mouse: 'Mouse',
            refrigerator_images: 'Refrigerator',
            router_images: 'Router',
            washing_machine: 'Washing Machine',
            wires: 'Wires'
        };
        const tr = document.createElement('tr');
        let optionsHtml = '<option value="" disabled selected>Select an item...</option>';
        classLabels.forEach(label => {
            optionsHtml += `<option value="${label}">${classDisplayNames[label] || label}</option>`;
        });
        tr.innerHTML = `
            <td>
              <select name="itemName" class="item-name-select" required>
                ${optionsHtml}
              </select>
            </td>
            <td><input type="number" name="itemQty" class="item-qty-input" min="1" value="${qty}" required></td>
            <td><button type="button" class="remove-item-btn" title="Remove Item">&times;</button></td>
        `;
        // Set value if provided and it's not the placeholder
        if (item) tr.querySelector('.item-name-select').value = item;
        // Remove row handler
        tr.querySelector('.remove-item-btn').addEventListener('click', () => {
            if (itemsTbody.rows.length > 1) {
                tr.remove();
            } else {
                alert('At least one item is required.');
            }
        });
        // Remove placeholder row if it exists and a real item is being added
        if (item && itemsTbody.rows.length === 1) {
            const firstRow = itemsTbody.rows[0];
            const firstSelect = firstRow.querySelector('.item-name-select');
            if (firstSelect && !firstSelect.value) {
                firstRow.remove();
            }
        }
        itemsTbody.appendChild(tr);
    }

    // Page Guard: Redirect if user is not logged in
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            console.log("No user signed in. Redirecting to login page.");
            // Pass the current page as a redirect parameter
            window.location.href = `auth.html?redirect=schedule.html`;
        }
    });

    let currentStep = 1;

    // --- Event Listeners ---

    // Add listener for the manual "Add Item" button
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            addItemRow();
        });
    }

    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            // Special validation for step 4 (Items)
            if (currentStep === 4) {
                const rows = itemsTbody.querySelectorAll('tr');
                let valid = false;
                itemsList = [];
                rows.forEach(row => {
                    const item = row.querySelector('.item-name-select').value;
                    const qty = parseInt(row.querySelector('.item-qty-input').value, 10);
                    // Ensure a valid item is selected (not the placeholder)
                    if (item && qty >= 1) {
                        valid = true;
                        // Calculate total weight for this item
                        const weightPerItem = ITEM_WEIGHT_MAP[item] || 0;
                        itemsList.push({ name: item, quantity: qty, weight: weightPerItem * qty });
                    }
                });
                if (!valid) {
                    alert('Please add at least one valid item and specify its quantity.');
                    return; // Stop advancement
                }
            }
            currentStep++;
            updateFormSteps();
            updateProgressBar();
        }
    });

    prevBtn.addEventListener('click', () => {
        currentStep--;
        updateFormSteps();
        updateProgressBar();
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;

        // This check is slightly redundant due to the guard above, but it's good practice.
        if (!user) {
            alert("You must be logged in to schedule a pickup.");
            window.location.href = 'auth.html';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Scheduling...';

        const formData = new FormData(form);
        const pickupData = {
            userId: user.uid,
            userEmail: user.email,
            fullName: formData.get('fullName'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            zip: formData.get('zip'),
            pickupDate: formData.get('pickupDate'),
            timeSlot: formData.get('timeSlot'),
            status: 'Scheduled',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            items: itemsList,
            recyclerId: 'unassigned',
            recyclerEmail: 'unassigned'
        };
        
        firebase.firestore().collection('pickups').add(pickupData)
            .then((docRef) => {
                console.log("Pickup scheduled with ID: ", docRef.id);
                alert("Pickup Scheduled Successfully!");
                form.reset();
                window.location.href = 'profile.html'; // Redirect to profile page after success
            })
            .catch(error => {
                console.error("Error scheduling pickup: ", error);
                alert("There was an error scheduling your pickup. Please try again.");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            });
    });

    function updateFormSteps() {
        formSteps.forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.dataset.step) === currentStep) {
                step.classList.add('active');
            }
        });

        prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
        nextBtn.style.display = currentStep < formSteps.length ? 'block' : 'none'; 
        submitBtn.style.display = currentStep === formSteps.length ? 'block' : 'none';

        if (currentStep === formSteps.length) {
            populateConfirmation();
        }
    }

    function updateProgressBar() {
        progressSteps.forEach((step, idx) => {
            if (idx < currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    function validateStep(step) {
        let isValid = true;
        const currentFormStep = formSteps[step - 1];
        const inputs = currentFormStep.querySelectorAll('input[required], select[required]');
        
        for (const input of inputs) {
            if (!input.value.trim()) {
                const label = currentFormStep.querySelector(`label[for="${input.id}"]`);
                const fieldName = label ? label.textContent.replace('*', '').trim() : (input.name || input.id);
                // Check if fieldName is not empty before alerting
                if (fieldName) {
                    alert(`Please fill out the "${fieldName}" field.`);
                } else {
                    alert('Please fill out all required fields.');
                }
                isValid = false;
                break; 
            }
        }
        return isValid;
    }

    function populateConfirmation() {
        const formData = new FormData(form);
        let itemsHtml = '<em>No items specified.</em>'; // Default text
        
        if (itemsList && itemsList.length > 0) {
            itemsHtml = '<ul>' + itemsList.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('') + '</ul>';
        }

        confirmationDetails.innerHTML = `
            <p><strong>Full Name:</strong> ${formData.get('fullName')}</p>
            <p><strong>Phone:</strong> ${formData.get('phone')}</p>
            <p><strong>Address:</strong> ${formData.get('address')}</p>
            <p><strong>City:</strong> ${formData.get('city')}</p>
            <p><strong>ZIP Code:</strong> ${formData.get('zip')}</p>
            <p><strong>Pickup Date:</strong> ${formData.get('pickupDate')}</p>
            <p><strong>Time Slot:</strong> ${formData.get('timeSlot')}</p>
            <p><strong>Items to Recycle:</strong></p>
            ${itemsHtml}
        `;
    }

// --- Image Classifier Integration (MobileNet/TensorFlow.js) ---

// Class labels in the exact order used during model training
const classLabels = [
    'CFL_bulbs',
    'batteries',
    'fan',
    'keyboards',
    'laptop',
    'mobile_phone',
    'motherboard',
    'mouse',
    'refrigerator_images',
    'router_images',
    'washing_machine',
    'wires'
];

// Map class labels to dropdown item keys (if needed)
const SUPPORTED_ITEMS_MAP = {
    CFL_bulbs: ['CFL_bulbs', 'bulbs'],
    batteries: ['batteries', 'battery'],
    fan: ['fan', 'ceiling fan'],
    keyboards: ['keyboards', 'keyboard'],
    laptop: ['laptop', 'laptops'],
    mobile_phone: ['mobile_phone', 'phones', 'phone'],
    motherboard: ['motherboard', 'circuit boards'],
    mouse: ['mouse'],
    refrigerator_images: ['refrigerator_images', 'refrigerator'],
    router_images: ['router_images', 'router'],
    washing_machine: ['washing_machine'],
    wires: ['wires', 'wire']
};

let classifierModel, classifierLoaded = false, classifierPredictedItem = null, classifierImage = null;

// Helper to load TensorFlow.js if not present
async function ensureTfLoaded() {
    if (typeof tf === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.18.0/dist/tf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
}

async function loadClassifierModel() {
    if (classifierLoaded) return;
    await ensureTfLoaded();
    classifierModel = await tf.loadLayersModel('../model_tfjs/model.json');
    classifierLoaded = true;
}

if (openClassifierBtn) {
    openClassifierBtn.addEventListener('click', async () => {
        classifierModal.style.display = 'block';
        classifierFileInput.value = '';
        classifierImagePreview.innerHTML = '';
        classifierResult.innerHTML = '';
        classifierConfirmBtn.style.display = 'none';
        classifierPredictedItem = null;
        classifierImage = null;
        await loadClassifierModel();
    });
}

function closeClassifierModal() {
    classifierModal.style.display = 'none';
    classifierFileInput.value = '';
    classifierImagePreview.innerHTML = '';
    classifierResult.innerHTML = '';
    classifierConfirmBtn.style.display = 'none';
    classifierPredictedItem = null;
    classifierImage = null;
}
if (closeClassifierBtn) closeClassifierBtn.onclick = closeClassifierModal;
if (classifierCancelBtn) classifierCancelBtn.onclick = closeClassifierModal;

if (classifierFileInput) {
    classifierFileInput.addEventListener('change', async () => {
        const file = classifierFileInput.files[0];
        if (!file) return;
        await loadClassifierModel();
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .div(255.0)
                .expandDims();
            const prediction = classifierModel.predict(tensor);
            const probs = await prediction.array();
            const maxIdx = probs[0].indexOf(Math.max(...probs[0]));
            const bestLabel = classLabels[maxIdx];
            const confidence = probs[0][maxIdx];

            classifierResult.innerHTML = `<strong>Prediction:</strong> ${bestLabel} <br><strong>Confidence:</strong> ${(confidence * 100).toFixed(1)}%`;

            if (confidence > 0.6) {
                classifierPredictedItem = bestLabel;
                classifierConfirmBtn.style.display = 'inline-block';
            } else {
                classifierPredictedItem = null;
                classifierConfirmBtn.style.display = 'none';
            }
        };
        classifierImagePreview.innerHTML = '';
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        classifierImagePreview.appendChild(img);
    });
}

if (classifierConfirmBtn) {
    classifierConfirmBtn.addEventListener('click', () => {
        if (!classifierPredictedItem) return;

        // Convert model label to dropdown option name (if different)
        const dropdownCompatibleName = (() => {
            const mapKeys = Object.keys(SUPPORTED_ITEMS_MAP);
            for (const key of mapKeys) {
                if (SUPPORTED_ITEMS_MAP[key].includes(classifierPredictedItem)) {
                    return key;
                }
            }
            return classifierPredictedItem; // fallback
        })();

        let found = false;
        const rows = itemsTbody.querySelectorAll('tr');
        rows.forEach(row => {
            const select = row.querySelector('.item-name-select');
            const qtyInput = row.querySelector('.item-qty-input');
            if (select.value === dropdownCompatibleName) {
                qtyInput.value = parseInt(qtyInput.value, 10) + 1;
                found = true;
            }
        });

        if (!found) addItemRow(dropdownCompatibleName, 1);
        closeClassifierModal();
    });
}


    // --- Rewards Points Scheme ---
    const ITEM_POINTS = {
        phones: 10,
        laptops: 20,
        batteries: 5,
        chargers: 3,
        wires: 2,
        'circuit boards': 8,
        mouse: 4,
        keyboard: 4
    };

    // Initialize button states on load
    updateFormSteps();
    updateProgressBar();

    if (currentStep === 4) {
        const rows = itemsTbody.querySelectorAll('tr');
        let valid = false;
        itemsList = [];
        rows.forEach(row => {
            const item = row.querySelector('.item-name-select').value;
            const qty = parseInt(row.querySelector('.item-qty-input').value, 10);
            // Ensure a valid item is selected (not the placeholder)
            if (item && qty >= 1) {
                valid = true;
                itemsList.push({ name: item, quantity: qty });
            }
        });
        if (!valid) {
            alert('Please select at least one valid item.');
            currentStep--;
            updateFormSteps();
            updateProgressBar();
        }
    }

    // At the very end, before the closing brace of DOMContentLoaded
    updateFormSteps();
    updateProgressBar();
    addItemRow();
}); 