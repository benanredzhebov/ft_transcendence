export const createTestPage = (): void => {
    // Add the Socket.IO script to the head
    const socketIoScript = document.createElement("script");
    socketIoScript.src = "/socket.io/socket.io.js";
    document.head.appendChild(socketIoScript);

    // Add the inline script to initialize the socket
    const inlineScript = document.createElement("script");
    inlineScript.textContent = `
      var socket = io();
      socket.on('connect', () => {
        console.log('Connected to server:', socket.id);
      });
    `;
    document.head.appendChild(inlineScript);

    // Create the main HTML structure
    const body = document.body;
    body.style.margin = "0";
    body.style.paddingBottom = "3rem";
    body.style.fontFamily =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    const messagesList = document.createElement("ul");
    messagesList.id = "messages";
    messagesList.style.listStyleType = "none";
    messagesList.style.margin = "0";
    messagesList.style.padding = "0";

    const form = document.createElement("form");
    form.id = "form";
    form.action = "";

    form.style.background = "rgba(0, 0, 0, 0.15)";
    form.style.padding = "0.25rem";
    form.style.position = "fixed";
    form.style.bottom = "0";
    form.style.left = "0";
    form.style.right = "0";
    form.style.display = "flex";
    form.style.height = "3rem";
    form.style.boxSizing = "border-box";
    form.style.backdropFilter = "blur(10px)";

    const input = document.createElement("input");
    input.id = "input";
    input.autocomplete = "off";
    input.style.border = "none";
    input.style.padding = "0 1rem";
    input.style.flexGrow = "1";
    input.style.borderRadius = "2rem";
    input.style.margin = "0.25rem";

    input.onfocus = () => {
        input.style.outline = "none";
    };

    const button = document.createElement("button");
    button.textContent = "Send";
    button.style.background = "#333";
    button.style.border = "none";
    button.style.padding = "0 1rem";
    button.style.margin = "0.25rem";
    button.style.borderRadius = "3px";
    button.style.outline = "none";
    button.style.color = "#fff";

    form.appendChild(input);
    form.appendChild(button);

    body.appendChild(messagesList);
    body.appendChild(form);
};

// Call the function to create the page
createTestPage();