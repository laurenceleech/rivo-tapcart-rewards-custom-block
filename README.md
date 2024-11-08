# Rivo Block for Tapcart

## Description
This Custom Loyalty Points and Rewards Block is designed to seamlessly integrate with Tapcart to display customer points, available rewards, and store-wide reward options directly within your mobile app's interface. It enables users to view their loyalty points, see potential rewards, and redeem them without leaving the app.

### Key Features
- Displays current loyalty points balance.
- Shows available and store-wide rewards.
- Allows customers to redeem rewards directly from the app.
- Supports Fixed rewards only - incremental rewards will not display.

## How This Block Works
1. **Customer Login Detection**: The block checks if a customer is signed in and updates the display accordingly.
2. **Fetching Data**:
   - The block fetches the customer's points balance using the provided API key and displays it.
   - It retrieves available rewards and store rewards and renders them on the screen.
3. **Redemption Process**:
   - Customers can tap on rewards to redeem them.
   - The block shows a confirmation prompt and processes the redemption upon user confirmation.

## Setup Instructions

### 1. Create a New Custom Block
- Log in to your Tapcart Dashboard.
- Navigate to **Custom Blocks** and create a new block.
- Name your block by clicking on "Name your block".

### 2. Import the Code
- Copy and paste the provided HTML, CSS, and JavaScript code into their respective tabs in the Tapcart Custom Block Editor:
  - **HTML Tab**: Paste the block's HTML code.
  - **CSS Tab**: Paste the block's styling code.
  - **JavaScript Tab**: Paste the JavaScript logic.

### 3. Update the Code
- [REQUIRED] Edit the following line in the JavaScript code:
  - Replace the placeholder API key with your actual API key:
    ```javascript
    const apiKey = 'YOUR_API_KEY';
    ```

### 4. Optional Customizations
- Customize the fonts by adding a custom font link in the **Settings** tab under "Import Fonts". Use `font-family` in your CSS to reference it.

### 5. Save and Add to Your App
- Once you've pasted and updated the code, save the block.
- Add the custom block to the desired page in your Tapcart app.


