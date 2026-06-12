const URL_BACKEND = 'https://chatback-09lx.onrender.com' 

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const limparBtn = document.getElementById('limparBtn');

    let userSessionId = sessionStorage.getItem('santos_chat_session_id') || null;

    // Função para adicionar mensagens no chat
    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
            sender = 'Você';
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
            sender = 'Mano Peixe';
        } else {
            messageElement.classList.add('status-message');
        }

        if (type === 'error') {
            messageElement.classList.add('error-text');
            sender = 'Erro';
        } else if (type === 'status') {
            messageElement.classList.add('status-text');
            sender = 'Status';
        }

        const senderSpan = document.createElement('strong');
        senderSpan.textContent = `${sender}: `;
        messageElement.appendChild(senderSpan);

        const textSpan = document.createElement('span');
        
        // Se for uma mensagem normal (bot ou usuário), renderiza o Markdown
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            // Se for erro ou status, mantém como texto puro
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Função para habilitar/desabilitar o chat
    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    // Inicialmente desativa o chat
    setChatEnabled(false);
    connectionStatus.textContent = 'Desconectado';
    connectionStatus.className = 'status-offline';
    const indicator = connectionStatus.closest('.status-indicator');
    if (indicator) {
        indicator.classList.add('status-offline');
        indicator.classList.remove('status-online');
    }
    addMessageToChat('Status', 'Conectando ao Alçapão da Vila...', 'status');

    // Função para conectar ao servidor
    function iniciarConversa() {
        if (socket && socket.connected) return;

        socket = io(URL_BACKEND, {
            query: {
                session_id: userSessionId || ''
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });

        socket.on('connect', () => {
            console.log('Conectado ao servidor Socket.IO! SID:', socket.id);
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            const indicator = connectionStatus.closest('.status-indicator');
            if (indicator) {
                indicator.classList.add('status-online');
                indicator.classList.remove('status-offline');
            }
            addMessageToChat('Status', 'Conectado ao Alçapão da Vila!', 'status');
            setChatEnabled(true);
        });

        socket.on('disconnect', () => {
            console.log('Desconectado do servidor Socket.IO.');
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            const indicator = connectionStatus.closest('.status-indicator');
            if (indicator) {
                indicator.classList.add('status-offline');
                indicator.classList.remove('status-online');
            }
            addMessageToChat('Status', 'Conexão perdida. Tentando reconectar...', 'status');
            setChatEnabled(false);
        });

        socket.on('connect_error', (error) => {
            console.log('Erro de conexão com o servidor:', error);
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            const indicator = connectionStatus.closest('.status-indicator');
            if (indicator) {
                indicator.classList.add('status-offline');
                indicator.classList.remove('status-online');
            }
            setChatEnabled(false);
        });

        socket.on('status_conexao', (data) => {
            if (data.session_id) {
                userSessionId = data.session_id;
                sessionStorage.setItem('santos_chat_session_id', userSessionId);
            }
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            addMessageToChat('Erro', data.erro, 'error');
        });
    }

    // Função para limpar as mensagens da tela
    function limparTela() {
        chatBox.innerHTML = ''; // Isso apaga todo o HTML de dentro da caixa de chat
        addMessageToChat('Status', 'Tela limpa.', 'status');
    }

    // Enviar mensagem para o servidor
    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
            messageInput.focus();
        } else {
            addMessageToChat('Erro', 'Não conectado ao servidor.', 'error');
        }
    }

    // Eventos dos botões
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageToServer();
        }
    });

    // Iniciar conexão automaticamente
    iniciarConversa();

    // Desconectar quando a página for fechada
    window.addEventListener('beforeunload', () => {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    });
});

