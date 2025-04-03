// Modificações para resolver o problema de loading eterno e adicionar seleção de contato

const API = {
    BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
      SELECT: '/api/select',
      INSERT: '/api/insert',
      UPDATE: id => `/api/update/${id}`,
      DELETE: id => `/api/delete/${id}`
    }
  };
  
  const DEFAULT_AVATAR = '../img/iconContact.png';
  
  // ===== STATE =====
  const state = {
    contacts: [],
    groups: [
      { id: 'familia', name: 'Família' },
      { id: 'alunos', name: 'Alunos' },
      { id: 'trabalho', name: 'Trabalho' },
      { id: 'amigos', name: 'Amigos' },
      { id: 'outros', name: 'Outros' },
      { id: 'todos', name: 'Todos' }
    ],
    filter: {
      category: 'todos',
      searchTerm: '',
      sort: 'name',
      view: 'grid'
    },
    currentContactId: null,
    currentGroupId: null
  };
  
  // ===== DOM ELEMENTS =====
  const elements = {
    contactsGrid: document.getElementById('contactsGrid'),
    contactsList: document.getElementById('contactsList'),
    searchInput: document.getElementById('searchInput'),
    sortButton: document.getElementById('sortButton'),
    viewOptions: document.querySelectorAll('.view-option'),
    dialogs: {
      message: document.getElementById('messageDialog'),
      profile: document.getElementById('profileDialog'),
      group: document.getElementById('groupDialog')
    },
    buttons: {
      addContact: document.getElementById('addContactBtn'),
      addGroup: document.getElementById('addGroupBtn'),
      email: document.getElementById('emailBtn'),
      sendMessage: document.getElementById('sendMessageBtn'),
      profileMessage: document.getElementById('profileMessageBtn'),
      profileDelete: document.getElementById('profileDeleteBtn'),
      profileSave: document.getElementById('profileSaveBtn'),
      saveGroup: document.getElementById('saveGroupBtn'),
      deleteGroup: document.getElementById('deleteGroupBtn')
    },
    inputs: {
      avatar: document.getElementById('avatarInput'),
      profileCategory: document.getElementById('profileCategory')
    },
    loading: document.getElementById('loadingSpinner'),
    navTabs: document.getElementById('navTabs')
  };
  
  // ===== UTILITY FUNCTIONS =====
  
  /**
  * Shows the loading spinner
  */
  const showLoading = () => {
    if (elements.loading) {
      elements.loading.style.display = 'flex';
    }
  };
  
  /**
  * Hides the loading spinner
  */
  const hideLoading = () => {
    if (elements.loading) {
      elements.loading.style.display = 'none';
    }
  };
  
  // Função para converter imagem em base64 (revisada)
  const imageToBase64 = file => {
    return new Promise((resolve, reject) => {
      if (!file || !(file instanceof File)) {
        reject(new Error('Arquivo inválido'));
        return;
      }
  
      // Verificar se é uma imagem
      if (!file.type.match('image.*')) {
        reject(new Error('O arquivo selecionado não é uma imagem'));
        return;
      }
  
      // Verificar tamanho do arquivo (limitar a 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        reject(new Error('A imagem deve ter no máximo 5MB'));
        return;
      }
  
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };
  
  // Função para formatar número de telefone no padrão (xx) xxxxx-xxxx
  const formatarTelefone = (telefone) => {
    // Remove todos os caracteres não numéricos
    let numero = telefone.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    numero = numero.substring(0, 11);
    
    // Formata o número no padrão (xx) xxxxx-xxxx
    if (numero.length > 0) {
      numero = '(' + numero.substring(0, 2);
      
      if (numero.length > 2) {
        numero += ') ' + numero.substring(2, 7);
        
        if (numero.length > 10) {
          numero += '-' + numero.substring(10, 15);
        }
      }
    }
    
    return numero;
  };
  
  // Função para aplicar a máscara de telefone em um input
  const aplicarMascaraTelefone = (input) => {
    input.addEventListener('input', function() {
      this.value = formatarTelefone(this.value);
    });
  };
  
  // Função para verificar se o usuário está logado
  const verificarLogin = () => {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) {
      // Redirecionar para a página de login se não estiver logado
      window.location.href = 'index.html';
      return null;
    }
    return usuarioLogado;
  };
  
  // Função para fazer logout
  const logout = () => {
    // Remover usuário do localStorage
    localStorage.removeItem('usuarioLogado');
    
    // Encerrar conexão com o banco (simulação)
    console.log('Conexão com o banco encerrada');
    
    // Redirecionar para a página de login
    window.location.href = 'index.html';
  };
  
  // Função para carregar dados do usuário na página home
  const carregarDadosUsuario = () => {
    const usuario = verificarLogin();
    if (!usuario) return;
    
    // Atualizar elementos da interface com os dados do usuário
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
      userNameElement.textContent = usuario.nome.split(' ')[0]; // Primeiro nome
    }
    
    const userRoleElement = document.querySelector('.user-role');
    if (userRoleElement) {
      userRoleElement.textContent = 'Usuário';
    }
  };
  
  // Função para abrir o diálogo de edição de perfil
  const abrirDialogEditarPerfil = () => {
    const usuario = verificarLogin();
    if (!usuario) return;
    
    // Criar diálogo de edição de perfil se não existir
    let dialogPerfil = document.getElementById('perfilDialog');
    
    if (!dialogPerfil) {
      dialogPerfil = document.createElement('div');
      dialogPerfil.id = 'perfilDialog';
      dialogPerfil.className = 'dialog';
      dialogPerfil.innerHTML = `
        <div class="dialog-content">
          <div class="dialog-header">
            <div class="dialog-title">Editar Perfil</div>
            <button class="dialog-close">&times;</button>
          </div>
          <div class="profile-avatar-container">
            <img src="${usuario.avatar || DEFAULT_AVATAR}" alt="Avatar" class="profile-avatar" id="perfilAvatar">
            <div class="avatar-upload">
              <label for="perfilAvatarInput" class="avatar-upload-btn">Inserir</label>
              <input type="file" id="perfilAvatarInput" class="avatar-input" accept="image/*">
            </div>
          </div>
          <input type="text" class="profile-input" id="perfilNome" placeholder="Nome completo" value="${usuario.nome}">
          <input type="email" class="profile-input" id="perfilEmail" placeholder="Email" value="${usuario.email}">
          <input type="tel" class="profile-input" id="perfilTelefone" placeholder="Telefone" value="${usuario.telefone}">
          <input type="password" class="profile-input" id="perfilSenha" placeholder="Nova senha">
          <input type="password" class="profile-input" id="perfilConfirmarSenha" placeholder="Confirmar nova senha">
          
          <div class="profile-actions">
            <button class="profile-button btn-delete" id="perfilLogoutBtn">Logout</button>
            <button class="profile-button btn-save" id="perfilSalvarBtn">Salvar</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialogPerfil);
      
      // Adicionar eventos aos botões
      const closeBtn = dialogPerfil.querySelector('.dialog-close');
      const logoutBtn = document.getElementById('perfilLogoutBtn');
      const salvarBtn = document.getElementById('perfilSalvarBtn');
      const avatarInput = document.getElementById('perfilAvatarInput');
      const telefoneInput = document.getElementById('perfilTelefone');
      
      // Aplicar máscara ao telefone
      aplicarMascaraTelefone(telefoneInput);
      
      // Evento para fechar o diálogo
      closeBtn.addEventListener('click', () => {
        dialogPerfil.style.display = 'none';
      });
      
      // Evento para fazer logout
      logoutBtn.addEventListener('click', logout);
      
      // Evento para salvar alterações
      salvarBtn.addEventListener('click', salvarAlteracoesPerfil);
      
      // Evento para upload de avatar
      avatarInput.addEventListener('change', async (event) => {
        try {
          const file = event.target.files[0];
          const base64Image = await imageToBase64(file);
          const perfilAvatar = document.getElementById('perfilAvatar');
          if (perfilAvatar) {
            perfilAvatar.src = base64Image;
          }
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          alert(error.message || 'Não foi possível processar a imagem. Tente novamente.');
        }
      });
      
      // Fechar diálogo ao clicar fora dele
      dialogPerfil.addEventListener('click', (e) => {
        if (e.target === dialogPerfil) {
          dialogPerfil.style.display = 'none';
        }
      });
    }
    
    // Exibir o diálogo
    dialogPerfil.style.display = 'flex';
  };
  
  // Função para salvar alterações do perfil
  const salvarAlteracoesPerfil = () => {
    const usuario = verificarLogin();
    if (!usuario) return;
    
    const nome = document.getElementById('perfilNome').value.trim();
    const email = document.getElementById('perfilEmail').value.trim();
    const telefone = document.getElementById('perfilTelefone').value.trim();
    const senha = document.getElementById('perfilSenha').value;
    const confirmarSenha = document.getElementById('perfilConfirmarSenha').value;
    const avatar = document.getElementById('perfilAvatar').src;
    
    // Validações
    if (!nome) {
      alert('Por favor, informe seu nome.');
      return;
    }
    
    if (!email) {
      alert('Por favor, informe seu email.');
      return;
    }
    
    if (!telefone) {
      alert('Por favor, informe seu telefone.');
      return;
    }
    
    // Validar senha apenas se foi preenchida
    if (senha) {
      if (senha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        return;
      }
      
      const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!regexSenha.test(senha)) {
        alert('A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um caractere especial.');
        return;
      }
    }
    
    // Atualizar dados do usuário
    usuario.nome = nome;
    usuario.email = email;
    usuario.telefone = telefone;
    usuario.avatar = avatar;
    
    if (senha) {
      usuario.senha = senha;
    }
    
    // Atualizar no localStorage
    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
    
    // Atualizar lista de usuários no localStorage
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const index = usuarios.findIndex(u => u.email === usuario.email);
    
    if (index !== -1) {
      usuarios[index] = usuario;
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
    }
    
    // Atualizar interface
    carregarDadosUsuario();
    
    // Fechar diálogo
    const dialogPerfil = document.getElementById('perfilDialog');
    if (dialogPerfil) {
      dialogPerfil.style.display = 'none';
    }
    
    alert('Perfil atualizado com sucesso!');
  };
  
  /**
  * Formats a date to YYYY-MM-DD
  * @param {Date} date - The date to format
  * @returns {string} - Formatted date string
  */
  const formatDate = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  /**
  * Formats a time to HH:MM
  * @param {Date} date - The date to extract time from
  * @returns {string} - Formatted time string
  */
  const formatTime = date => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  /**
  * Sets the default date and time for message scheduling
  */
  const setDefaultDateTime = () => {
    const now = new Date();
    const dateInput = document.getElementById('messageDate');
    const timeInput = document.getElementById('messageTime');
    
    if (dateInput && timeInput) {
      dateInput.value = formatDate(now);
      timeInput.value = formatTime(now);
    }
  };
  
  /**
  * Closes all dialogs
  */
  const closeDialogs = () => {
    Object.values(elements.dialogs).forEach(dialog => {
      if (dialog) {
        dialog.style.display = 'none';
      }
    });
  };
  
  // ===== API FUNCTIONS =====
  
  /**
  * Fetches all contacts from the API
  */
  const fetchContacts = async () => {
    showLoading();
    
    try {
      // Verificar se o logger existe antes de usá-lo
      if (window.logger && typeof window.logger.info === 'function') {
        window.logger.info('Iniciando busca de contatos', 'Frontend');
      }
  
      try {
        const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.SELECT}`);
        
        // Se não conseguir conectar ao servidor, carregue dados de exemplo
        if (!response.ok) {
          console.warn('Não foi possível conectar ao servidor. Carregando dados de exemplo.');
          loadMockData();
          return;
        }
        
        const data = await response.json();
        
        // Transform API data to our format
        state.contacts = data.map(contact => ({
          id: contact.id,
          name: contact.nome,
          phone: contact.telefone,
          email: contact.email,
          avatar: contact.imagem || DEFAULT_AVATAR,
          category: contact.grupo || 'outros',
          date: new Date(contact.data_criacao || Date.now())
        }));
        
        if (window.logger && typeof window.logger.info === 'function') {
          window.logger.info(`Contatos carregados com sucesso: ${state.contacts.length}`, 'Frontend');
        }
      } catch (error) {
        console.error('Erro ao buscar contatos do servidor:', error);
        // Carregar dados de exemplo em caso de erro
        loadMockData();
      }
    } catch (error) {
      console.error('Erro geral na função fetchContacts:', error);
      // Garantir que os dados de exemplo sejam carregados em qualquer caso de erro
      loadMockData();
    } finally {
      // Renderizar contatos independentemente da fonte dos dados
      renderContacts();
      hideLoading();
    }
  };
  
  /**
  * Carrega dados de exemplo quando não é possível conectar ao servidor
  */
  const loadMockData = () => {
    console.log('Carregando dados de exemplo...');
    state.contacts = [
      {
        id: 1,
        name: 'Ana Costa',
        phone: '(11) 93456-7890',
        email: 'ana.costa@exemplo.com',
        avatar: DEFAULT_AVATAR,
        category: 'familia',
        date: new Date('2023-01-15')
      },
      {
        id: 2,
        name: 'Carlos Pereira',
        phone: '(11) 94567-8901',
        email: 'carlos.pereira@exemplo.com',
        avatar: DEFAULT_AVATAR,
        category: 'trabalho',
        date: new Date('2023-02-20')
      },
      {
        id: 3,
        name: 'João Silva',
        phone: '(11) 98765-4321',
        email: 'joao.silva@exemplo.com',
        avatar: DEFAULT_AVATAR,
        category: 'amigos',
        date: new Date('2023-03-10')
      },
      {
        id: 4,
        name: 'Maria Santos',
        phone: '(11) 91234-5678',
        email: 'maria.santos@exemplo.com',
        avatar: DEFAULT_AVATAR,
        category: 'familia',
        date: new Date('2023-04-05')
      },
      {
        id: 5,
        name: 'Pedro Oliveira',
        phone: '(11) 92345-6789',
        email: 'pedro.oliveira@exemplo.com',
        avatar: DEFAULT_AVATAR,
        category: 'trabalho',
        date: new Date('2023-05-12')
      },
      {
        id: 6,
        name: 'Sofia Rodrigues',
        phone: '(11) 95678-9012',
        email: 'sofia.rodrigues@exemplo.com',
        avatar: DEFAULT_AVATAR,
        category: 'amigos',
        date: new Date('2023-06-18')
      }
    ];
    
    console.log('Dados de exemplo carregados com sucesso:', state.contacts.length, 'contatos');
  };
  
  //Whatts mensager 
  document.addEventListener('DOMContentLoaded', function() {
    const sendMessageWhatts = document.getElementById("sendMessagewhatts");
    if (sendMessageWhatts) {
      sendMessageWhatts.addEventListener("click", function() {
        const contactSelect = document.getElementById('contactSelect');
        const selectedContactId = contactSelect ? parseInt(contactSelect.value) : null;
        const contact = selectedContactId ? state.contacts.find(c => c.id === selectedContactId) : null;
        
        const phoneNumber = contact ? contact.phone.replace(/\D/g, '') : '';
        const message = document.getElementById("messageText").value.trim();
  
        if (!phoneNumber) {
          alert("Selecione um contato com número de telefone válido.");
          return;
        }
  
        if (!message) {
          alert("Digite uma mensagem antes de enviar.");
          return;
        }
  
        const encodedMessage = encodeURIComponent(message);
        const whatsappLink = `https://wa.me/${phoneNumber}/?text=${encodedMessage}`;
  
        window.open(whatsappLink, "_blank");
      });
    }
  });
  
  /**
  * Creates a new contact via API
  * @param {Object} contact - The contact to create
  * @returns {Promise<boolean>} - Success status
  */
  const createContact = async contact => {
    showLoading();
    
    try {
      if (window.logger && typeof window.logger.info === 'function') {
        window.logger.info('Criando novo contato', 'Frontend', { name: contact.name, email: contact.email });
      }
  
      try {
        // Create the request body without the image field to avoid the database error
        const requestBody = {
            nome: contact.name,
            email: contact.email,
            telefone: contact.phone,
            grupo: contact.category
        };
        
        const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.INSERT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          // Se não conseguir conectar ao servidor, simule a criação
          console.warn('Não foi possível conectar ao servidor. Simulando criação de contato.');
          simulateCreateContact(contact);
          return true;
        }
        
        if (window.logger && typeof window.logger.info === 'function') {
          window.logger.info('Contato criado com sucesso', 'Frontend', { name: contact.name });
        }
        
        await fetchContacts();
        return true;
      } catch (error) {
        console.error('Erro ao criar contato no servidor:', error);
        // Simular criação em caso de erro
        simulateCreateContact(contact);
        return true;
      }
    } catch (error) {
      console.error('Erro geral na função createContact:', error);
      return false;
    } finally {
      hideLoading();
    }
  };
  
  /**
  * Simula a criação de um contato quando não é possível conectar ao servidor
  * @param {Object} contact - O contato a ser criado
  */
  const simulateCreateContact = (contact) => {
    const newId = state.contacts.length > 0 
      ? Math.max(...state.contacts.map(c => c.id)) + 1 
      : 1;
    
    const newContact = {
      ...contact,
      id: newId,
      date: new Date()
    };
    
    state.contacts.push(newContact);
    console.log('Contato simulado criado com sucesso:', newContact);
    renderContacts();
  };
  
  /**
  * Updates an existing contact via API
  * @param {Object} contact - The contact to update
  * @returns {Promise<boolean>} - Success status
  */
  const updateContact = async contact => {
    showLoading();
    
    try {
      if (window.logger && typeof window.logger.info === 'function') {
        window.logger.info('Atualizando contato', 'Frontend', { id: contact.id, name: contact.name });
      }
  
      try {
        // Create the request body without the image field to avoid the database error
        const requestBody = {
            nome: contact.name,
            email: contact.email,
            telefone: contact.phone,
            grupo: contact.category
        };
        
        const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.UPDATE(contact.id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          // Se não conseguir conectar ao servidor, simule a atualização
          console.warn('Não foi possível conectar ao servidor. Simulando atualização de contato.');
          simulateUpdateContact(contact);
          return true;
        }
        
        if (window.logger && typeof window.logger.info === 'function') {
          window.logger.info('Contato atualizado com sucesso', 'Frontend', { id: contact.id, name: contact.name });
        }
        
        await fetchContacts();
        return true;
      } catch (error) {
        console.error('Erro ao atualizar contato no servidor:', error);
        // Simular atualização em caso de erro
        simulateUpdateContact(contact);
        return true;
      }
    } catch (error) {
      console.error('Erro geral na função updateContact:', error);
      return false;
    } finally {
      hideLoading();
    }
  };
  
  /**
  * Simula a atualização de um contato quando não é possível conectar ao servidor
  * @param {Object} contact - O contato a ser atualizado
  */
  const simulateUpdateContact = (contact) => {
    const index = state.contacts.findIndex(c => c.id === contact.id);
    if (index !== -1) {
      state.contacts[index] = {
        ...contact,
        date: new Date()
      };
      console.log('Contato simulado atualizado com sucesso:', contact);
      renderContacts();
    }
  };
  
  /**
  * Deletes a contact via API
  * @param {number} contactId - The ID of the contact to delete
  * @returns {Promise<boolean>} - Success status
  */
  const deleteContactAPI = async contactId => {
    showLoading();
    
    try {
      if (window.logger && typeof window.logger.info === 'function') {
        window.logger.info('Deletando contato', 'Frontend', { id: contactId });
      }
  
      try {
        const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.DELETE(contactId)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
          // Se não conseguir conectar ao servidor, simule a exclusão
          console.warn('Não foi possível conectar ao servidor. Simulando exclusão de contato.');
          simulateDeleteContact(contactId);
          return true;
        }
  
        if (window.logger && typeof window.logger.info === 'function') {
          window.logger.info('Contato deletado com sucesso', 'Frontend', { id: contactId });
        }
        
        await fetchContacts();
        return true;
      } catch (error) {
        console.error('Erro ao deletar contato no servidor:', error);
        // Simular exclusão em caso de erro
        simulateDeleteContact(contactId);
        return true;
      }
    } catch (error) {
      console.error('Erro geral na função deleteContactAPI:', error);
      return false;
    } finally {
      hideLoading();
    }
  };
  
  /**
  * Simula a exclusão de um contato quando não é possível conectar ao servidor
  * @param {number} contactId - O ID do contato a ser excluído
  */
  const simulateDeleteContact = (contactId) => {
    state.contacts = state.contacts.filter(c => c.id !== contactId);
    console.log('Contato simulado excluído com sucesso:', contactId);
    renderContacts();
  };
  
  // ===== RENDERING FUNCTIONS =====
  
  /**
  * Updates the category select options in the profile dialog
  */
  const updateCategorySelect = () => {
    if (!elements.inputs.profileCategory) return;
    
    elements.inputs.profileCategory.innerHTML = '';
    state.groups.forEach(group => {
        if (group.id !== 'todos') {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            elements.inputs.profileCategory.appendChild(option);
        }
    });
  };
  
  /**
  * Sorts contacts based on current sort setting
  * @param {Array} contacts - The contacts to sort
  * @returns {Array} - Sorted contacts
  */
  const sortContacts = contacts => {
    const sortedContacts = [...contacts];
    
    switch (state.filter.sort) {
        case 'name':
            sortedContacts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sortedContacts.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'recent':
            sortedContacts.sort((a, b) => b.date - a.date);
            break;
        default:
            sortedContacts.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return sortedContacts;
  };
  
  /**
  * Renders contacts based on current filter, search, and sort settings
  */
  const renderContacts = () => {
    if (!elements.contactsGrid || !elements.contactsList) return;
    
    // Filter contacts based on category and search term
    const filteredContacts = state.contacts.filter(contact => {
        const matchesCategory = state.filter.category === 'todos' || contact.category === state.filter.category;
        const matchesSearch = state.filter.searchTerm === '' || 
            contact.name.toLowerCase().includes(state.filter.searchTerm.toLowerCase()) ||
            contact.phone.includes(state.filter.searchTerm);
        return matchesCategory && matchesSearch;
    });
    
    // Sort contacts
    const sortedContacts = sortContacts(filteredContacts);
    
    // Clear both containers
    elements.contactsGrid.innerHTML = '';
    elements.contactsList.innerHTML = '';
    
    // Generate contacts based on current view
    if (state.filter.view === 'grid') {
        elements.contactsGrid.style.display = 'grid';
        elements.contactsList.style.display = 'none';
        
        sortedContacts.forEach(contact => {
            const contactCard = document.createElement('div');
            contactCard.className = 'contact-card';
            contactCard.dataset.id = contact.id;
            contactCard.innerHTML = `
                <img src="${contact.avatar}" alt="${contact.name}" class="contact-avatar">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-phone">${contact.phone}</div>
            `;
            elements.contactsGrid.appendChild(contactCard);
  
            // Add click event to open profile dialog
            contactCard.addEventListener('click', () => {
                openProfileDialog(contact.id);
            });
        });
    } else {
        elements.contactsGrid.style.display = 'none';
        elements.contactsList.style.display = 'flex';
        
        sortedContacts.forEach(contact => {
            const contactRow = document.createElement('div');
            contactRow.className = 'contact-row';
            contactRow.dataset.id = contact.id;
            contactRow.innerHTML = `
                <img src="${contact.avatar}" alt="${contact.name}" class="contact-avatar">
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-email">${contact.email}</div>
                </div>
                <div class="contact-phone">${contact.phone}</div>
            `;
            elements.contactsList.appendChild(contactRow);
  
            // Add click event to open profile dialog
            contactRow.addEventListener('click', () => {
                openProfileDialog(contact.id);
            });
        });
    }
  };
  
  /**
  * Updates navigation tabs based on current groups
  */
  const updateNavTabs = () => {
    if (!elements.navTabs) return;
    
    elements.navTabs.innerHTML = '';
    
    state.groups.forEach(group => {
        const tabElement = document.createElement('div');
        tabElement.className = 'nav-tab';
        if (state.filter.category === group.id) {
            tabElement.classList.add('active');
        }
        tabElement.dataset.category = group.id;
        
        // Adicionar conteúdo do tab com ícone e nome
        tabElement.innerHTML = `
          <div class="nav-tab-content">
            <i class="fas fa-user"></i> ${group.name}
          </div>
          ${group.id !== 'todos' ? '<div class="edit-group-btn" title="Editar grupo">⚙️</div>' : ''}
        `;
        
        // Add event listener to edit group button for all groups except 'todos'
        if (group.id !== 'todos') {
          setTimeout(() => {
              const editBtn = tabElement.querySelector('.edit-group-btn');
              if (editBtn) {
                  editBtn.addEventListener('click', (e) => {
                      e.stopPropagation();
                      openGroupDialog(group.id);
                  });
              }
          }, 0);
        }
        
        // Add event listener to tab
        tabElement.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tabElement.classList.add('active');
            state.filter.category = group.id;
            renderContacts();
        });
        
        elements.navTabs.appendChild(tabElement);
    });
  };
  
  // ===== DIALOG FUNCTIONS =====
  
  /**
  * Opens the message dialog for a specific contact
  * @param {number|null} contactId - The ID of the contact, or null to select from dropdown
  */
  const openMessageDialog = contactId => {
    if (!elements.dialogs.message) return;
    
    const contactSelect = document.getElementById('contactSelect');
    const messageRecipient = document.getElementById('messageRecipient');
    
    // Preencher o select com todos os contatos
    if (contactSelect) {
      contactSelect.innerHTML = '<option value="">Selecione um contato</option>';
      
      // Ordenar contatos por nome para facilitar a seleção
      const sortedContacts = [...state.contacts].sort((a, b) => a.name.localeCompare(b.name));
      
      sortedContacts.forEach(contact => {
        const option = document.createElement('option');
        option.value = contact.id;
        option.textContent = `${contact.name} (${contact.phone})`;
        contactSelect.appendChild(option);
      });
      
      // Se um contato específico foi passado, selecione-o no dropdown
      if (contactId) {
        contactSelect.value = contactId;
        state.currentContactId = contactId;
        
        // Atualizar o texto do destinatário
        const selectedContact = state.contacts.find(c => c.id === contactId);
        if (selectedContact && messageRecipient) {
          messageRecipient.textContent = `Para: ${selectedContact.name} (${selectedContact.phone})`;
        }
      } else {
        // Limpar o texto do destinatário se nenhum contato foi selecionado
        if (messageRecipient) {
          messageRecipient.textContent = '';
        }
        state.currentContactId = null;
      }
      
      // Adicionar evento de mudança para atualizar o texto do destinatário
      contactSelect.addEventListener('change', () => {
        const selectedId = parseInt(contactSelect.value);
        state.currentContactId = selectedId || null;
        
        if (selectedId && messageRecipient) {
          const selectedContact = state.contacts.find(c => c.id === selectedId);
          if (selectedContact) {
            messageRecipient.textContent = `Para: ${selectedContact.name} (${selectedContact.phone})`;
          }
        } else if (messageRecipient) {
          messageRecipient.textContent = '';
        }
      });
    }
    
    // Limpar o campo de mensagem
    const messageText = document.getElementById('messageText');
    if (messageText) {
      messageText.value = '';
    }
    
    // Configurar data e hora padrão
    setDefaultDateTime();
    
    // Exibir o diálogo
    elements.dialogs.message.style.display = 'flex';
  };
  
  /**
  * Opens the profile dialog for creating or editing a contact
  * @param {number|null} contactId - The ID of the contact to edit, or null for a new contact
  */
  const openProfileDialog = contactId => {
    if (!elements.dialogs.profile) return;
    
    updateCategorySelect();
    
    let contact;
    
    if (contactId) {
        contact = state.contacts.find(c => c.id === contactId);
        state.currentContactId = contactId;
    } else {
        // New contact
        contact = {
            id: null,
            name: '',
            phone: '',
            email: '',
            avatar: DEFAULT_AVATAR,
            category: state.filter.category === 'todos' ? 'outros' : state.filter.category,
            date: new Date()
        };
        state.currentContactId = null;
    }
  
    const profileName = document.getElementById('profileName');
    const profilePhone = document.getElementById('profilePhone');
    const profileEmail = document.getElementById('profileEmail');
    const profileCategory = document.getElementById('profileCategory');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) profileName.value = contact.name;
    if (profilePhone) profilePhone.value = contact.phone;
    if (profileEmail) profileEmail.value = contact.email;
    if (profileCategory) profileCategory.value = contact.category;
    if (profileAvatar) profileAvatar.src = contact.avatar;
    
    elements.dialogs.profile.style.display = 'flex';
  };
  
  /**
  * Opens the group dialog for creating or editing a group
  * @param {string|null} groupId - The ID of the group to edit, or null for a new group
  */
  const openGroupDialog = (groupId = null) => {
    if (!elements.dialogs.group) return;
    
    const groupDialogTitle = document.getElementById('groupDialogTitle');
    const groupName = document.getElementById('groupName');
    const groupMembersList = document.getElementById('groupMembersList');
    const deleteGroupBtn = document.getElementById('deleteGroupBtn');
    
    if (groupId) {
        // Edit existing group
        state.currentGroupId = groupId;
        const group = state.groups.find(g => g.id === groupId);
        
        if (group) {
            if (groupDialogTitle) groupDialogTitle.textContent = 'Editar Grupo';
            if (groupName) groupName.value = group.name;
            if (deleteGroupBtn) deleteGroupBtn.style.display = 'block';
        }
    } else {
        // New group
        state.currentGroupId = null;
        if (groupDialogTitle) groupDialogTitle.textContent = 'Novo Grupo';
        if (groupName) groupName.value = '';
        if (deleteGroupBtn) deleteGroupBtn.style.display = 'none';
    }
    
    // Generate member list
    if (groupMembersList) {
      groupMembersList.innerHTML = '';
      state.contacts.forEach(contact => {
          const memberItem = document.createElement('div');
          memberItem.className = 'member-item';
          
          const isInGroup = contact.category === (state.currentGroupId || '');
          
          memberItem.innerHTML = `
              <input type="checkbox" class="member-checkbox" data-id="${contact.id}" ${isInGroup ? 'checked' : ''}>
              <div class="member-name">${contact.name}</div>
          `;
          
          groupMembersList.appendChild(memberItem);
      });
    }
    
    elements.dialogs.group.style.display = 'flex';
  };
  
  // ===== ACTION FUNCTIONS =====
  
  /**
  * Saves the current contact (creates or updates)
  */
  const saveContact = async () => {
    const profileName = document.getElementById('profileName');
    const profilePhone = document.getElementById('profilePhone');
    const profileEmail = document.getElementById('profileEmail');
    const profileCategory = document.getElementById('profileCategory');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (!profileName || !profilePhone) return;
    
    const name = profileName.value.trim();
    const phone = profilePhone.value.trim();
    const email = profileEmail ? profileEmail.value.trim() : '';
    const category = profileCategory ? profileCategory.value : 'outros';
    const avatar = profileAvatar ? profileAvatar.src : DEFAULT_AVATAR;
    
    if (!name || !phone) {
        alert('Por favor, preencha pelo menos o nome e o número de telefone.');
        return;
    }
    
    const contact = {
        id: state.currentContactId,
        name,
        phone,
        email,
        category,
        avatar,
        date: new Date()
    };
    
    let success = false;
    
    if (state.currentContactId) {
        // Update existing contact
        success = await updateContact(contact);
    } else {
        // Add new contact
        success = await createContact(contact);
    }
    
    if (success) {
        closeDialogs();
    }
  };
  
  /**
  * Saves the current group (creates or updates)
  */
  const saveGroup = async () => {
    const groupName = document.getElementById('groupName');
    if (!groupName) return;
    
    const name = groupName.value.trim();
    
    if (!name) {
        alert('Por favor, insira um nome para o grupo.');
        return;
    }
    
    if (state.currentGroupId) {
        // Update existing group
        const index = state.groups.findIndex(g => g.id === state.currentGroupId);
        if (index !== -1) {
            state.groups[index].name = name;
        }
    } else {
        // Create new group
        const groupId = name.toLowerCase().replace(/\s+/g, '-');
        
        // Check if group ID already exists
        if (state.groups.some(g => g.id === groupId)) {
            alert('Um grupo com este nome já existe. Por favor, escolha outro nome.');
            return;
        }
        
        // Add new group
        state.groups.push({
            id: groupId,
            name: name
        });
        
        state.currentGroupId = groupId;
    }
    
    // Update member assignments
    const memberCheckboxes = document.querySelectorAll('.member-checkbox');
    const updatePromises = [];
    
    memberCheckboxes.forEach(checkbox => {
        const contactId = parseInt(checkbox.dataset.id);
        const contact = state.contacts.find(c => c.id === contactId);
        
        if (contact) {
            const shouldBeInGroup = checkbox.checked;
            const isInGroup = contact.category === state.currentGroupId;
            
            if (shouldBeInGroup !== isInGroup) {
                const updatedContact = {
                    ...contact,
                    category: shouldBeInGroup ? state.currentGroupId : 'outros'
                };
                
                updatePromises.push(updateContact(updatedContact));
            }
        }
    });
    
    if (updatePromises.length > 0) {
        showLoading();
        try {
            await Promise.all(updatePromises);
        } finally {
            hideLoading();
        }
    }
    
    closeDialogs();
    updateNavTabs();
    renderContacts();
  };
  
  /**
  * Deletes the current group
  */
  const deleteGroup = async () => {
    if (!state.currentGroupId) return;
    
    // Não permitir excluir grupos padrão
    const defaultGroups = ['familia', 'alunos', 'trabalho', 'amigos', 'outros', 'todos'];
    if (defaultGroups.includes(state.currentGroupId)) {
      alert('Não é possível excluir grupos padrão do sistema.');
      return;
    }
    
    if (confirm(`Tem certeza que deseja excluir o grupo "${state.groups.find(g => g.id === state.currentGroupId)?.name}"?`)) {
        // Move contacts to "outros" category
        const updatePromises = [];
        
        state.contacts.forEach(contact => {
            if (contact.category === state.currentGroupId) {
                const updatedContact = {
                    ...contact,
                    category: 'outros'
                };
                
                updatePromises.push(updateContact(updatedContact));
            }
        });
        
        if (updatePromises.length > 0) {
            showLoading();
            try {
                await Promise.all(updatePromises);
            } finally {
                hideLoading();
            }
        }
        
        // Remove group
        state.groups = state.groups.filter(g => g.id !== state.currentGroupId);
        
        // Update current filter if needed
        if (state.filter.category === state.currentGroupId) {
            state.filter.category = 'todos';
        }
        
        closeDialogs();
        updateNavTabs();
        renderContacts();
    }
  };
  
  /**
  * Deletes the current contact
  */
  const deleteContact = async () => {
    if (state.currentContactId && confirm('Tem certeza que deseja excluir este contato?')) {
        const success = await deleteContactAPI(state.currentContactId);
        
        if (success) {
            closeDialogs();
        }
    }
  };
  
  /**
  * Agenda uma mensagem para ser enviada em um horário específico
  */
  const sendMessage = () => {
    const contactSelect = document.getElementById('contactSelect');
    const messageText = document.getElementById('messageText');
    const messageDate = document.getElementById('messageDate');
    const messageTime = document.getElementById('messageTime');
    
    if (!contactSelect || !messageText || !messageDate || !messageTime) return;
    
    const selectedContactId = parseInt(contactSelect.value);
    const text = messageText.value.trim();
    const date = messageDate.value;
    const time = messageTime.value;
    
    if (!selectedContactId) {
      alert('Por favor, selecione um contato.');
      return;
    }
    
    if (!text) {
      alert('Por favor, escreva uma mensagem.');
      return;
    }
    
    if (!date || !time) {
      alert('Selecione uma data e hora para agendamento.');
      return;
    }
    
    const contact = state.contacts.find(c => c.id === selectedContactId);
    if (contact) {
      const scheduledDateTime = new Date(`${date}T${time}`);
      
      // Verificar se a data é válida
      if (isNaN(scheduledDateTime.getTime())) {
        alert('Data ou hora inválida. Por favor, verifique o formato.');
        return;
      }
      
      // Verificar se a data não é no passado
      if (scheduledDateTime < new Date()) {
        alert('Não é possível agendar mensagens para o passado. Por favor, selecione uma data e hora futura.');
        return;
      }
      
      // Criar objeto de agendamento
      const scheduledMessage = {
        id: Date.now(), // ID único baseado no timestamp atual
        contactId: selectedContactId,
        contactName: contact.name,
        contactPhone: contact.phone,
        message: text,
        scheduledTime: scheduledDateTime.getTime()
      };
      
      // Armazenar o agendamento no localStorage
      saveScheduledMessage(scheduledMessage);
      
      // Configurar o temporizador para exibir o alerta no momento agendado
      scheduleMessageAlert(scheduledMessage);
      
      alert(`Mensagem agendada para ${contact.name} às ${scheduledDateTime.toLocaleString()}: ${text}`);
      closeDialogs();
    }
  };
  
  /**
  * Salva uma mensagem agendada no localStorage
  * @param {Object} scheduledMessage - A mensagem agendada
  */
  const saveScheduledMessage = (scheduledMessage) => {
    // Obter mensagens agendadas existentes
    const scheduledMessages = JSON.parse(localStorage.getItem('scheduledMessages') || '[]');
    
    // Adicionar nova mensagem
    scheduledMessages.push(scheduledMessage);
    
    // Salvar de volta no localStorage
    localStorage.setItem('scheduledMessages', JSON.stringify(scheduledMessages));
    
    console.log('Mensagem agendada salva:', scheduledMessage);
  };
  
  /**
  * Configura um temporizador para exibir o alerta no momento agendado
  * @param {Object} scheduledMessage - A mensagem agendada
  */
  const scheduleMessageAlert = (scheduledMessage) => {
    const now = new Date().getTime();
    const delay = scheduledMessage.scheduledTime - now;
    
    // Se o tempo já passou, não agendar
    if (delay <= 0) return;
    
    console.log(`Agendando alerta para mensagem ID ${scheduledMessage.id} em ${Math.floor(delay/1000)} segundos`);
    
    // Configurar o temporizador
    setTimeout(() => {
      const contact = state.contacts.find(c => c.id === scheduledMessage.contactId);
      
      if (contact) {
        const phoneNumber = contact.phone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(scheduledMessage.message);
        const whatsappLink = `https://wa.me/${phoneNumber}/?text=${encodedMessage}`;
        
        // Exibir alerta com opção para enviar a mensagem
        if (confirm(`Hora de enviar a mensagem agendada para ${contact.name}:\n\n${scheduledMessage.message}\n\nClique em OK para abrir o WhatsApp e enviar a mensagem.`)) {
          window.open(whatsappLink, "_blank");
        }
        
        // Remover a mensagem da lista de agendamentos
        removeScheduledMessage(scheduledMessage.id);
      }
    }, delay);
  };
  
  /**
  * Remove uma mensagem agendada do localStorage
  * @param {number} messageId - O ID da mensagem a ser removida
  */
  const removeScheduledMessage = (messageId) => {
    // Obter mensagens agendadas existentes
    const scheduledMessages = JSON.parse(localStorage.getItem('scheduledMessages') || '[]');
    
    // Filtrar a mensagem a ser removida
    const updatedMessages = scheduledMessages.filter(msg => msg.id !== messageId);
    
    // Salvar de volta no localStorage
    localStorage.setItem('scheduledMessages', JSON.stringify(updatedMessages));
    
    console.log('Mensagem agendada removida:', messageId);
  };
  
  /**
  * Verifica e agenda todas as mensagens salvas no localStorage
  * Deve ser chamada na inicialização da aplicação
  */
  const checkScheduledMessages = () => {
    // Obter mensagens agendadas existentes
    const scheduledMessages = JSON.parse(localStorage.getItem('scheduledMessages') || '[]');
    
    if (scheduledMessages.length > 0) {
      console.log(`Encontradas ${scheduledMessages.length} mensagens agendadas.`);
      
      // Configurar temporizadores para cada mensagem
      scheduledMessages.forEach(message => {
        // Verificar se o tempo ainda não passou
        if (message.scheduledTime > new Date().getTime()) {
          scheduleMessageAlert(message);
        } else {
          // Se o tempo já passou, remover da lista
          console.log(`Mensagem ID ${message.id} já passou do tempo agendado. Removendo...`);
          removeScheduledMessage(message.id);
        }
      });
    }
  };
  
  /**
  * Handles avatar upload
  * @param {Event} event - The change event
  */
  const handleAvatarUpload = async event => {
    const file = event.target.files[0];
    if (file) {
        try {
            // Convert image to base64
            const base64Image = await imageToBase64(file);
            const profileAvatar = document.getElementById('profileAvatar');
            if (profileAvatar) {
              profileAvatar.src = base64Image;
            }
        } catch (error) {
            console.error('Error converting image:', error);
            alert('Não foi possível processar a imagem. Tente novamente.');
        }
    }
  };
  
  // ===== EVENT LISTENERS =====
  
  /**
  * Sets up all event listeners
  */
  const setupEventListeners = () => {
    // Search functionality
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', e => {
          state.filter.searchTerm = e.target.value;
          renderContacts();
      });
    }
    
    // Sort button functionality
    if (elements.sortButton) {
      elements.sortButton.addEventListener('click', () => {
          // Create a dropdown menu for sorting
          const dropdown = document.createElement('div');
          dropdown.className = 'sort-dropdown';
          dropdown.style.position = 'absolute';
          dropdown.style.top = `${elements.sortButton.offsetTop + elements.sortButton.offsetHeight}px`;
          dropdown.style.right = '20px';
          dropdown.style.backgroundColor = 'white';
          dropdown.style.border = '1px solid #ced4da';
          dropdown.style.borderRadius = '8px';
          dropdown.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
          dropdown.style.zIndex = '100';
          
          const options = [
              { value: 'name', label: 'Nome (A-Z)' },
              { value: 'name-desc', label: 'Nome (Z-A)' },
              { value: 'recent', label: 'Mais recentes' }
          ];
          
          options.forEach(option => {
              const item = document.createElement('div');
              item.className = 'sort-item';
              item.style.padding = '10px 15px';
              item.style.cursor = 'pointer';
              item.style.transition = 'background-color 0.2s';
              item.textContent = option.label;
              
              if (state.filter.sort === option.value) {
                  item.style.backgroundColor = '#e9ecef';
                  item.style.fontWeight = 'bold';
              }
              
              item.addEventListener('mouseover', () => {
                  if (state.filter.sort !== option.value) {
                      item.style.backgroundColor = '#f8f9fa';
                  }
              });
              
              item.addEventListener('mouseout', () => {
                  if (state.filter.sort !== option.value) {
                      item.style.backgroundColor = 'white';
                  }
              });
              
              item.addEventListener('click', () => {
                  state.filter.sort = option.value;
                  renderContacts();
                  document.body.removeChild(dropdown);
              });
              
              dropdown.appendChild(item);
          });
          
          document.body.appendChild(dropdown);
          
          // Close dropdown when clicking outside
          const closeDropdown = (e) => {
              if (!dropdown.contains(e.target) && e.target !== elements.sortButton) {
                  document.body.removeChild(dropdown);
                  document.removeEventListener('click', closeDropdown);
              }
          };
          
          // Delay adding the event listener to prevent immediate closing
          setTimeout(() => {
              document.addEventListener('click', closeDropdown);
          }, 0);
      });
    }
    
    // View options
    elements.viewOptions.forEach(option => {
        option.addEventListener('click', () => {
            elements.viewOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            state.filter.view = option.dataset.view;
            renderContacts();
        });
    });
    
    // Dialog close buttons
    document.querySelectorAll('.dialog-close').forEach(btn => {
        btn.addEventListener('click', closeDialogs);
    });
    
    // Close dialog when clicking outside
    Object.values(elements.dialogs).forEach(dialog => {
        if (dialog) {
          dialog.addEventListener('click', e => {
              if (e.target === dialog) {
                  closeDialogs();
              }
          });
        }
    });
    
    // Button event listeners
    if (elements.buttons.sendMessage) {
      elements.buttons.sendMessage.addEventListener('click', sendMessage);
    }
    
    if (elements.buttons.profileMessage) {
      elements.buttons.profileMessage.addEventListener('click', () => {
          const contactId = state.currentContactId;
          closeDialogs();
          openMessageDialog(contactId);
      });
    }
    
    if (elements.buttons.profileDelete) {
      elements.buttons.profileDelete.addEventListener('click', deleteContact);
    }
    
    if (elements.buttons.profileSave) {
      elements.buttons.profileSave.addEventListener('click', saveContact);
    }
    
    if (elements.buttons.saveGroup) {
      elements.buttons.saveGroup.addEventListener('click', saveGroup);
    }
    
    if (elements.buttons.deleteGroup) {
      elements.buttons.deleteGroup.addEventListener('click', deleteGroup);
    }
    
    if (elements.buttons.addContact) {
      elements.buttons.addContact.addEventListener('click', () => openProfileDialog());
    }
    
    if (elements.buttons.addGroup) {
      elements.buttons.addGroup.addEventListener('click', () => openGroupDialog());
    }
    
    if (elements.buttons.email) {
      elements.buttons.email.addEventListener('click', () => {
          // Open message dialog for first contact in current filter
          openMessageDialog(null);
      });
    }
    
    // Avatar upload
    if (elements.inputs.avatar) {
      elements.inputs.avatar.addEventListener('change', handleAvatarUpload);
    }
  };
  
  // ===== INITIALIZATION =====
  
  /**
  * Initializes the application
  */
  const init = () => {
    console.log('Inicializando aplicação...');
    
    // Fetch contacts from API
    fetchContacts();
    
    // Update navigation tabs
    updateNavTabs();
    
    // Update category select
    updateCategorySelect();
    
    // Set up event listeners
    setupEventListeners();
    
    // Verificar mensagens agendadas
    checkScheduledMessages();
    
    console.log('Aplicação inicializada com sucesso!');
  };
  
  // Adicionar evento para abrir o diálogo de edição de perfil
  document.addEventListener('DOMContentLoaded', function() {
    // Carregar dados do usuário
    carregarDadosUsuario();
    
    // Adicionar evento ao clicar no perfil do usuário
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
      userProfile.addEventListener('click', abrirDialogEditarPerfil);
    }
    
    // Aplicar máscara de telefone a todos os inputs de telefone
    const telefoneInputs = document.querySelectorAll('input[type="tel"]');
    telefoneInputs.forEach(input => {
      aplicarMascaraTelefone(input);
    });
    
    // Verificar e agendar mensagens
    checkScheduledMessages();
  });
  
  // Initialize the application when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);