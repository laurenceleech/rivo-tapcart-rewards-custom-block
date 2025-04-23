// Replace with your Rivo API key
const apiKey = 'YOUR_API_KEY';

// Function to update the HTML based on login status
function updateDisplayBasedOnCustomerStatus() {
    if (Tapcart.variables.customer && Tapcart.variables.customer.id) {     
        document.getElementById('points-toggle-container').style.display = 'block';
        document.getElementById('logged-out-msg').style.display = 'none';

        // Points balance and toggle message start with skeleton state
        document.getElementById('points-balance').innerHTML = '<div class="points-skeleton skeleton"></div>';
        document.getElementById('toggle-message').innerHTML = '<div class="toggle-skeleton skeleton"></div>';

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
            // Replace skeleton with actual content
            document.getElementById('points-balance').innerHTML = `✨ You have ${pointsTally.toLocaleString()} points`;
            document.getElementById('toggle-message').innerHTML = 'Tap to view rewards';
        }
    } catch (error) {
        console.error('Error fetching customer points:', error);
        // In case of error, show error state instead of skeleton
        document.getElementById('points-balance').innerHTML = 'Unable to load points';
        document.getElementById('toggle-message').innerHTML = 'Tap to retry';
    }
}

// Constants for pagination
const REWARDS_PER_PAGE = 5;
let availableRewardsPage = 1;
let storeRewardsPage = 1;
let allAvailableRewards = [];
let allStoreRewards = [];

// Function to create skeleton reward cards with dynamic count
function createSkeletonRewards(count = 1) {
    return Array(count).fill().map(() => `
        <div class="reward-skeleton">
            <div class="reward-title-skeleton skeleton"></div>
            <div class="reward-subtitle-skeleton skeleton"></div>
        </div>
    `).join('');
}

// Function to fetch and display available rewards for the customer
async function fetchAvailableRewards(customerId, expectedCount = 1) {
    const availableRewardsContainer = document.querySelector('.available-rewards');
    const content = document.getElementById('expandable-content');
    const toggleMessage = document.getElementById('toggle-message');
    
    // Store current toggle state
    const wasExpanded = content.classList.contains('expanded');
    
    // Show initial skeleton with expected count
    availableRewardsContainer.innerHTML = createSkeletonRewards(expectedCount);
    
    // Maintain correct toggle message during loading
    if (wasExpanded) {
        toggleMessage.textContent = 'Tap to collapse';
    }
    
    try {
        const response = await fetch(`https://developer-api.rivo.io/merchant_api/v1/points_redemptions?filters[customer_identifier]=${customerId}&filters[used]=false&filters[refunded_at]=null&filters[revoked_at]=null&sort[order_direction]=desc&sort[order_type]=applied_at&pagination[per_page]=100&pagination[page]=1`, {
            method: 'GET',
            headers: { Authorization: apiKey }
        });

        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
            allAvailableRewards = data.data.filter(reward => 
                !reward.attributes.refunded_at && 
                !reward.attributes.revoked_at && 
                !reward.attributes.used_at
            );

            if (allAvailableRewards.length > 0) {
                displayAvailableRewardsPage();
                
                if (allAvailableRewards.length > REWARDS_PER_PAGE) {
                    availableRewardsContainer.insertAdjacentHTML('afterend', 
                        `<div class="show-more-btn" id="available-show-more" style="color: ${Tapcart.variables.theme.tokens.colors.textColors.secondaryColor}">
                            Show More (${REWARDS_PER_PAGE}/${allAvailableRewards.length})
                        </div>`
                    );
                    
                    document.getElementById('available-show-more').addEventListener('click', displayAvailableRewardsPage);
                }
                
                // Ensure toggle message stays correct
                if (wasExpanded) {
                    toggleMessage.textContent = 'Tap to collapse';
                }
            } else {
                availableRewardsContainer.innerHTML = 'No available rewards at the moment.';
            }
        } else {
            availableRewardsContainer.innerHTML = 'No available rewards at the moment.';
        }
    } catch (error) {
        console.error('Error fetching available rewards:', error);
        availableRewardsContainer.innerHTML = 'Unable to load rewards. Please try again later.';
    }
    
    // Final check to ensure toggle message is correct
    if (wasExpanded) {
        toggleMessage.textContent = 'Tap to collapse';
    }
}

// Function to display a page of available rewards
function displayAvailableRewardsPage() {
    const container = document.querySelector('.available-rewards');
    const content = document.getElementById('expandable-content');
    const toggleMessage = document.getElementById('toggle-message');
    const startIdx = (availableRewardsPage - 1) * REWARDS_PER_PAGE;
    const endIdx = startIdx + REWARDS_PER_PAGE;
    const pageRewards = allAvailableRewards.slice(startIdx, endIdx);
    const theme = Tapcart.variables.theme.tokens.colors;
    
    const rewardCards = pageRewards.map(reward => `
        <div class="reward-card" id="reward-card-${reward.id}" onclick="applyRewardDiscount('${reward.id}', '${reward.attributes.name}', '${reward.attributes.code}')">
            <div class="reward-name" style="color: ${theme.textColors.primaryColor}">${reward.attributes.name}</div>
            <div class="reward-subtitle" style="color: ${theme.textColors.secondaryColor}">Tap to apply to checkout</div>
        </div>
    `).join('');

    if (availableRewardsPage === 1) {
        container.innerHTML = rewardCards;
    } else {
        container.innerHTML += rewardCards;
    }

    // Apply styles to the newly created reward cards
    styleRewardCards();

    // Maintain correct toggle message if content is expanded
    if (content.classList.contains('expanded')) {
        toggleMessage.textContent = 'Tap to collapse';
    }

    const showMoreBtn = document.getElementById('available-show-more');
    if (showMoreBtn) {
        if (endIdx >= allAvailableRewards.length) {
            showMoreBtn.style.display = 'none';
        } else {
            showMoreBtn.textContent = `Show More (${endIdx}/${allAvailableRewards.length})`;
        }
    }

    availableRewardsPage++;
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
function openAuthentication() {
    Tapcart.actions.openAuthentication();
}

// Function to fetch and display store rewards
async function fetchStoreRewards() {
    const storeRewardsContainer = document.querySelector('.store-rewards');
    
    // Show skeleton loading state
    storeRewardsContainer.innerHTML = createSkeletonRewards();
    
    try {
        const response = await fetch('https://developer-api.rivo.io/merchant_api/v1/rewards', {
            method: 'GET',
            headers: { Authorization: apiKey }
        });

        const data = await response.json();

        allStoreRewards = data.data.filter(reward => 
            reward.attributes.source === 'points' && 
            reward.attributes.points_type === 'fixed' && 
            reward.attributes.reward_type != 'free_product'
        );

        if (allStoreRewards.length > 0) {
            displayStoreRewardsPage();
            
            if (allStoreRewards.length > REWARDS_PER_PAGE) {
                storeRewardsContainer.insertAdjacentHTML('afterend', 
                    `<div class="show-more-btn" id="store-show-more" style="color: ${Tapcart.variables.theme.tokens.colors.textColors.secondaryColor}">
                        Show More (${REWARDS_PER_PAGE}/${allStoreRewards.length})
                    </div>`
                );
                
                document.getElementById('store-show-more').addEventListener('click', displayStoreRewardsPage);
            }
        } else {
            storeRewardsContainer.textContent = 'No rewards available in the store.';
        }
    } catch (error) {
        console.error('Error fetching store rewards:', error);
        storeRewardsContainer.innerHTML = 'Unable to load store rewards. Please try again later.';
    }
}

// Function to display a page of store rewards
function displayStoreRewardsPage() {
    const container = document.querySelector('.store-rewards');
    const startIdx = (storeRewardsPage - 1) * REWARDS_PER_PAGE;
    const endIdx = startIdx + REWARDS_PER_PAGE;
    const pageRewards = allStoreRewards.slice(startIdx, endIdx);
    const theme = Tapcart.variables.theme.tokens.colors;
    
    const rewardCards = pageRewards.map(reward => `
        <div class="reward-card" id="store-reward-${reward.id}">
            <div class="reward-name" style="color: ${theme.textColors.primaryColor}">${reward.attributes.name}</div>
            <div class="reward-subtitle" style="color: ${theme.textColors.secondaryColor}">${reward.attributes.points_amount} points</div>
        </div>
    `).join('');

    if (storeRewardsPage === 1) {
        container.innerHTML = rewardCards;
    } else {
        container.innerHTML += rewardCards;
    }

    // Apply styles to the newly created reward cards
    styleRewardCards();

    // Add click handlers for the new cards
    pageRewards.forEach(reward => {
        const rewardCard = document.getElementById(`store-reward-${reward.id}`);
        rewardCard.addEventListener('click', () => 
            handleRedeemRewardClick(reward.id, reward.attributes.name, reward.attributes.points_amount)
        );
    });

    const showMoreBtn = document.getElementById('store-show-more');
    if (showMoreBtn) {
        if (endIdx >= allStoreRewards.length) {
            showMoreBtn.style.display = 'none';
        } else {
            showMoreBtn.textContent = `Show More (${endIdx}/${allStoreRewards.length})`;
        }
    }

    storeRewardsPage++;
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
    const theme = Tapcart.variables.theme.tokens.colors;

    if (rewardCard.classList.contains('disabled')) return;

    if (timeoutMap[rewardId]) {
        clearTimeout(timeoutMap[rewardId]);
        delete timeoutMap[rewardId];
    }

    if (pointsTally >= pointsAmount) {
        rewardCard.innerHTML = `
            <div style="color: ${theme.textColors.primaryColor}">Redeem ${rewardName}?</div>
            <div class="confirm-buttons">
                 <button id="confirm-${rewardId}" style="background-color: ${theme.buttonColors.primaryFill}; color: ${theme.buttonColors.primaryText}">Yes</button>
                 <button id="cancel-${rewardId}" style="background-color: ${theme.buttonColors.secondaryFill}; color: ${theme.buttonColors.secondaryText}">No</button>
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
            <div class="reward-name" style="color: ${theme.textColors.primaryColor}">${rewardName}</div>
            <div class="reward-subtitle" style="color: ${theme.textColors.secondaryColor}">Not enough points</div>
        `;
        setTimeout(() => {
            revertRewardCard(rewardId, rewardName, pointsAmount);
        }, 10000); // 10 seconds
    }
}

// Function to confirm reward redemption
async function confirmRedemption(rewardId, rewardName, pointsAmount) {
    const rewardCard = document.getElementById(`store-reward-${rewardId}`);
    disableAllCards();
    rewardCard.innerHTML = `<div style="color: ${Tapcart.variables.theme.tokens.colors.textColors.secondaryColor}">Redeeming...</div>`;

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
            rewardCard.innerHTML = `<div style="color: ${Tapcart.variables.theme.tokens.colors.stateColors.success}">Success!</div>`;
            
            // Reset available rewards page counter
            availableRewardsPage = 1;
            
            // Calculate expected number of skeleton items (current + 1, max of 5)
            const currentRewardsCount = allAvailableRewards.length;
            const expectedSkeletonCount = Math.min(currentRewardsCount + 1, 5);
            
            // Show skeleton loading state in available rewards
            const availableRewardsContainer = document.querySelector('.available-rewards');
            if (availableRewardsContainer) {
                availableRewardsContainer.innerHTML = createSkeletonRewards(expectedSkeletonCount);
            }
            
            // Remove any existing "Show More" button
            const showMoreBtn = document.getElementById('available-show-more');
            if (showMoreBtn) {
                showMoreBtn.remove();
            }
            
            setTimeout(async () => {
                await fetchCustomerPoints(Tapcart.variables.customer.id);
                await fetchAvailableRewards(Tapcart.variables.customer.id, expectedSkeletonCount);
                revertRewardCard(rewardId, rewardName, pointsAmount);
                enableAllCards();
            }, 1000);
        } else {
            rewardCard.innerHTML = `<div style="color: ${Tapcart.variables.theme.tokens.colors.stateColors.error}">Error redeeming reward</div>`;
            enableAllCards();
        }
    } catch (error) {
        console.error('Error in reward redemption:', error);
        rewardCard.innerHTML = `<div>Failed to redeem reward</div>`;
        enableAllCards();
    }
}

// Function to revert the card to its initial state
function revertRewardCard(rewardId, rewardName, pointsAmount) {
    const rewardCard = document.getElementById(`store-reward-${rewardId}`);
    const theme = Tapcart.variables.theme.tokens.colors;
    
    rewardCard.innerHTML = `
        <div class="reward-name" style="color: ${theme.textColors.primaryColor}">${rewardName}</div>
        <div class="reward-subtitle" style="color: ${theme.textColors.secondaryColor}">${pointsAmount} points</div>
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
    const theme = Tapcart.variables.theme.tokens.colors;
      console.log("Clicked!")
    Tapcart.actions.action("trigger/haptic")
    Tapcart.actions.applyDiscount({ discountCode: discountCode });
    const rewardCard = document.getElementById(`reward-card-${rewardId}`);
    rewardCard.innerHTML = `<div class="reward-applied" style="color: ${theme.stateColors.success}">${rewardName} applied! <br>View your savings at checkout.</div>`;

    setTimeout(() => {
        rewardCard.innerHTML = `
            <div class="reward-name" style="color: ${theme.textColors.primaryColor}">${rewardName}</div>
            <div class="reward-subtitle" style="color: ${theme.textColors.secondaryColor}">Tap to apply to checkout</div>
        `;
    }, 5000);
}

// Function to toggle the visibility of the rewards section
function toggleRewards() {
    const content = document.getElementById('expandable-content');
    const toggleMessage = document.getElementById('toggle-message');
    content.classList.toggle('expanded');
    toggleMessage.textContent = content.classList.contains('expanded') ? 'Tap to collapse' : 'Tap to view rewards';

    // If collapsing, reset the pagination and refresh the rewards display
    if (!content.classList.contains('expanded')) {
        // Reset page counters
        availableRewardsPage = 1;
        storeRewardsPage = 1;

        // Clear existing rewards displays
        const availableRewardsContainer = document.querySelector('.available-rewards');
        const storeRewardsContainer = document.querySelector('.store-rewards');
        
        // Remove existing "Show More" buttons if they exist
        const availableShowMore = document.getElementById('available-show-more');
        const storeShowMore = document.getElementById('store-show-more');
        if (availableShowMore) availableShowMore.remove();
        if (storeShowMore) storeShowMore.remove();

        // Re-display first page of rewards
        if (allAvailableRewards.length > 0) {
            displayAvailableRewardsPage();
            // Re-add "Show More" button for available rewards if needed
            if (allAvailableRewards.length > REWARDS_PER_PAGE) {
                availableRewardsContainer.insertAdjacentHTML('afterend', 
                    `<div class="show-more-btn" id="available-show-more" style="color: ${Tapcart.variables.theme.tokens.colors.textColors.secondaryColor}">
                        Show More (${REWARDS_PER_PAGE}/${allAvailableRewards.length})
                    </div>`
                );
                document.getElementById('available-show-more').addEventListener('click', displayAvailableRewardsPage);
            }
        }
        if (allStoreRewards.length > 0) {
            displayStoreRewardsPage();
            // Re-add "Show More" button for store rewards if needed
            if (allStoreRewards.length > REWARDS_PER_PAGE) {
                storeRewardsContainer.insertAdjacentHTML('afterend', 
                    `<div class="show-more-btn" id="store-show-more" style="color: ${Tapcart.variables.theme.tokens.colors.textColors.secondaryColor}">
                        Show More (${REWARDS_PER_PAGE}/${allStoreRewards.length})
                    </div>`
                );
                document.getElementById('store-show-more').addEventListener('click', displayStoreRewardsPage);
            }
        }
    }
}
 

function applyCustomStyles() {
    const theme = Tapcart.variables.theme.tokens.colors;

    document.querySelector('#points-toggle-container').style.backgroundColor = theme.coreColors.pageColor;
    document.querySelector('.footer-container').style.backgroundColor = theme.coreColors.pageColor;

    document.querySelector('#points-balance').style.color = theme.textColors.pageTitle;
    document.querySelector('#logged-out-msg').style.color = theme.textColors.pageTitle;
    document.querySelector('#toggle-message').style.color = theme.textColors.secondaryColor;

    const sectionTitles = document.querySelectorAll('.rewards-section-title');
    sectionTitles.forEach(title => {
        title.style.color = theme.textColors.pageTitle;
    });
  
    document.querySelector('.reward-skeleton').style.borderColor = theme.coreColors.dividingLines;

    const confirmButtons = document.querySelectorAll('.confirm-buttons button');
    confirmButtons.forEach(button => {
        button.style.borderColor = theme.coreColors.dividingLines;
    });

    if (theme.buttonColors.primaryOutlineEnabled) {
        document.querySelector('.footer-container').style.borderColor = theme.buttonColors.primaryOutlineColor;
    } else if (theme.buttonColors.secondaryOutlineEnabled) {
        document.querySelector('.footer-container').style.borderColor = theme.buttonColors.secondaryOutlineColor;
    } else {
        document.querySelector('.footer-container').style.borderColor = theme.coreColors.dividingLines;
    }
}

function styleRewardCards() {
    const theme = Tapcart.variables.theme.tokens.colors;
    const rewardCards = document.querySelectorAll('.reward-card');
    
    rewardCards.forEach(card => {
        card.style.backgroundColor = theme.coreColors.pageColor;
        
        if (theme.buttonColors.primaryOutlineEnabled) {
            card.style.borderColor = theme.buttonColors.primaryOutlineColor;
        } else if (theme.buttonColors.secondaryOutlineEnabled) {
            card.style.borderColor = theme.buttonColors.secondaryOutlineColor;
        } else {
            card.style.borderColor = theme.coreColors.dividingLines;
        }

        const subtitle = card.querySelector('.reward-subtitle');
        if (subtitle) {
            subtitle.style.color = theme.textColors.secondaryColor;
        }
    });
}

applyCustomStyles();
