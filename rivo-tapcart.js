// Replace with your Rivo API key
const apiKey = 'YOUR_API_KEY';

// Function to update the HTML based on login status
function updateDisplayBasedOnCustomerStatus() {
    if (Tapcart.variables.customer && Tapcart.variables.customer.id) {     
        document.getElementById('points-toggle-container').style.display = 'block';
        document.getElementById('logged-out-msg').style.display = 'none';

        fetchCustomerPoints(Tapcart.variables.customer.id);
        fetchAvailableRewards(Tapcart.variables.customer.id);
        fetchStoreRewards(Tapcart.variables.customer.id);
    } else {
        document.getElementById('points-toggle-container').style.display = 'none';
        document.getElementById('logged-out-msg').style.display = 'block';
    }
}

// Function to fetch and display customer points balance
async function fetchCustomerPoints(customerId) {
    try {
        const response = await fetch(`https://developer-api.rivo.io/merchant_api/v1/customers/${customerId}`, {
            method: 'GET',
            headers: { Authorization: apiKey }
        });

        const data = await response.json();
        if (data && data.data && data.data.attributes) {
            pointsTally = data.data.attributes.points_tally;
            document.getElementById('points-balance').textContent = `✨ You have ${pointsTally.toLocaleString()} points`;
        }
    } catch (error) {
        console.error('Error fetching customer points:', error);
    }
}

// Function to fetch and display available rewards for the customer
async function fetchAvailableRewards(customerId) {
    const availableRewardsContainer = document.querySelector('.available-rewards');
    let allRewards = [];
    let currentPage = 1;
    const perPage = 25;

    try {
        let hasMorePages = true;

        while (hasMorePages) {
            const response = await fetch(`https://developer-api.rivo.io/merchant_api/v1/points_redemptions?filters[customer_identifier]=${customerId}&filters[used]=false&sort[order_direction]=desc&sort[order_type]=applied_at&pagination[per_page]=${perPage}&pagination[page]=${currentPage}`, {
                method: 'GET',
                headers: { Authorization: apiKey }
            });

            const data = await response.json();

            if (data.data.length === 0) {
                hasMorePages = false;
                break;
            }

            allRewards = allRewards.concat(
                data.data.filter(reward => reward.attributes.refunded_at === null && reward.attributes.revoked_at === null)
            );

            if (data.links && data.links.next) {
                currentPage++;
            } else {
                hasMorePages = false;
            }
        }

        if (allRewards.length > 0) {
            let rewardCards = '';
            allRewards.forEach(reward => {
                const discountCode = reward.attributes.code;
                const rewardName = reward.attributes.name;

                console.log("Building card for reward:", rewardName);

                rewardCards += `
                    <div class="reward-card" id="reward-card-${reward.id}" onclick="applyRewardDiscount('${reward.id}', '${rewardName}', '${discountCode}')">
                        <div class="reward-name">${rewardName}</div>
                        <div class="reward-subtitle">Tap to apply to cart</div>
                    </div>
                `;
            });

            availableRewardsContainer.innerHTML = rewardCards.length > 0 
                ? rewardCards 
                : 'No available rewards at the moment.';
            console.log("Updated available rewards container with cards.");
        } else {
            console.log("No available rewards found.");
        }

    } catch (error) {
        console.error('Error fetching available rewards:', error);
    }
}

// Register the event handler for customer status updates
Tapcart.registerEventHandler("customer/updated", function(eventData) {
    updateDisplayBasedOnCustomerStatus();
});

// Initial call to set up the display when the page loads
updateDisplayBasedOnCustomerStatus();

// Global points tally to ensure consistent access across functions
let pointsTally;

// Object to keep track of timeouts for each reward card
const timeoutMap = {};

//  Retrieve customer ID from Tapcart
const customerId = Tapcart.variables.customer.id;

// Function to redirect to account page
function redirectToAccount() {
    Tapcart.actions.openScreen({
        destination: { type: "internal", url: "/account" }
    });
}

// Function to fetch and display store rewards
async function fetchStoreRewards() {
    try {
        const response = await fetch('https://developer-api.rivo.io/merchant_api/v1/rewards', {
            method: 'GET',
            headers: { Authorization: apiKey }
        });

        const data = await response.json();
        const storeRewardsContainer = document.querySelector('.store-rewards');

        const rewards = data.data.filter(reward => reward.attributes.source === 'points' && reward.attributes.points_type === 'fixed');

        if (rewards.length > 0) {
            let rewardCards = '';
            rewards.forEach(reward => {
                const rewardName = reward.attributes.name;
                const pointsAmount = reward.attributes.points_amount;

                rewardCards += `
                    <div class="reward-card" id="store-reward-${reward.id}">
                        <div class="reward-name">${rewardName}</div>
                        <div class="reward-subtitle">${pointsAmount} points</div>
                    </div>
                `;
            });
            storeRewardsContainer.innerHTML = rewardCards;

            rewards.forEach(reward => {
                const rewardCard = document.getElementById(`store-reward-${reward.id}`);
                rewardCard.addEventListener('click', () => handleRedeemRewardClick(reward.id, reward.attributes.name, reward.attributes.points_amount));
            });
        } else {
            storeRewardsContainer.textContent = 'No rewards available in the store.';
        }
    } catch (error) {
        console.error('Error fetching store rewards:', error);
    }
}

// Function to disable all reward cards
function disableAllCards() {
    const rewardCards = document.querySelectorAll('.reward-card');
    rewardCards.forEach(card => card.classList.add('disabled'));
}

// Function to enable all reward cards
function enableAllCards() {
    const rewardCards = document.querySelectorAll('.reward-card');
    rewardCards.forEach(card => card.classList.remove('disabled'));
}

// Function to handle reward card click for redemption confirmation
async function handleRedeemRewardClick(rewardId, rewardName, pointsAmount) {
    const rewardCard = document.getElementById(`store-reward-${rewardId}`);

    if (rewardCard.classList.contains('disabled')) return;

    if (timeoutMap[rewardId]) {
        clearTimeout(timeoutMap[rewardId]);
        delete timeoutMap[rewardId];
    }

    if (pointsTally >= pointsAmount) {
        rewardCard.innerHTML = `
            <div>Redeem ${rewardName}?</div>
            <div class="confirm-buttons">
                <button id="confirm-${rewardId}">Yes</button>
                <button id="cancel-${rewardId}">No</button>
            </div>
        `;

         // Bind the "No" button to cancelRedemption
        const cancelBtn = document.getElementById(`cancel-${rewardId}`);
        cancelBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent parent click event from triggering
            cancelRedemption(rewardId, rewardName, pointsAmount);
        });

        // Bind the "Yes" button to confirmRedemption
        const confirmBtn = document.getElementById(`confirm-${rewardId}`);
        confirmBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent parent click event from triggering
            confirmRedemption(rewardId, rewardName, pointsAmount);
        });

        timeoutMap[rewardId] = setTimeout(() => {
            revertRewardCard(rewardId, rewardName, pointsAmount);
        }, 20000); // 20 seconds
    } else {
        rewardCard.innerHTML = `
            <div class="reward-name">${rewardName}</div>
            <div class="reward-subtitle">Not enough points</div>
        `;
        setTimeout(() => {
            revertRewardCard(rewardId, rewardName, pointsAmount);
        }, 10000); // 10 seconds
    }
}

// Confirm reward redemption
async function confirmRedemption(rewardId, rewardName, pointsAmount) {
    const rewardCard = document.getElementById(`store-reward-${rewardId}`);
    disableAllCards();
    rewardCard.innerHTML = `<div>Redeeming...</div>`;

    try {
        const response = await fetch('https://developer-api.rivo.io/merchant_api/v1/points_redemptions', {
            method: 'POST',
            headers: {
                Authorization: apiKey,
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                customer_identifier: Tapcart.variables.customer.id,
                reward_id: rewardId
            })
        });

        const data = await response.json();

        if (data && data.data && data.data.id) {
            rewardCard.innerHTML = `<div>Success!</div>`;
            fetchAvailableRewards(Tapcart.variables.customer.id);
            fetchCustomerPoints(Tapcart.variables.customer.id);
            setTimeout(() => {
                revertRewardCard(rewardId, rewardName, pointsAmount);
                enableAllCards();
            }, 3000); // 3 seconds delay
        } else {
            rewardCard.innerHTML = `<div>Error redeeming reward</div>`;
            enableAllCards();
        }
    } catch (error) {
        rewardCard.innerHTML = `<div>Failed to redeem reward</div>`;
        enableAllCards();
    }
}

// Function to revert the card to its initial state
function revertRewardCard(rewardId, rewardName, pointsAmount) {
    const rewardCard = document.getElementById(`store-reward-${rewardId}`);
    rewardCard.innerHTML = `
        <div class="reward-name">${rewardName}</div>
        <div class="reward-subtitle">${pointsAmount} points</div>
    `;

    if (timeoutMap[rewardId]) {
        clearTimeout(timeoutMap[rewardId]);
        delete timeoutMap[rewardId];
    }

    rewardCard.onclick = function() {
        handleRedeemRewardClick(rewardId, rewardName, pointsAmount);
    };
}

// Cancel the reward redemption and revert the card back to its initial state
function cancelRedemption(rewardId, rewardName, pointsAmount) {
    revertRewardCard(rewardId, rewardName, pointsAmount);
}

// Function to apply the discount code and temporarily show the "Discount applied" message
function applyRewardDiscount(rewardId, rewardName, discountCode) {
    Tapcart.actions.applyDiscount({ discountCode: discountCode });
    const rewardCard = document.getElementById(`reward-card-${rewardId}`);
    rewardCard.innerHTML = `<div class="reward-applied">Discount applied</div>`;

    setTimeout(() => {
        rewardCard.innerHTML = `
            <div class="reward-name">${rewardName}</div>
            <div class="reward-subtitle">Tap to apply to cart</div>
        `;
    }, 3000);
}

// Function to toggle the visibility of the rewards section
function toggleRewards() {
    const content = document.getElementById('expandable-content');
    const toggleMessage = document.getElementById('toggle-message');
    content.classList.toggle('expanded');
    toggleMessage.textContent = content.classList.contains('expanded') ? 'Tap to collapse' : 'Tap to view rewards';
}
