import React, { useState, useEffect, useMemo } from 'react';
// EN TU PC LOCAL: Descomenta las siguientes 2 líneas para usar el PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LayoutDashboard,
  PlusCircle,
  CheckCircle,
  Search,
  X,
  Menu,
  FileText,
  Clock,
  Send,
  AlertCircle,
  MessageSquare,
  Tag,
  Database,
  Wifi,
  WifiOff,
  Pencil,
  Save,
  FileDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Volume2,
  User,
  Users,
  Lock,
  LogOut,
  Shield
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3001/api/tasks`;

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Badge = ({ type, value }) => {
  const styles = {
    prioridad: {
      Alta: "bg-red-100 text-red-800 border-red-200",
      Média: "bg-orange-100 text-orange-800 border-orange-200",
      Normal: "bg-slate-100 text-slate-800 border-slate-200",
    },
    estado: {
      Aberto: "bg-blue-100 text-blue-800 border-blue-200",
      Terceiros: "bg-purple-100 text-purple-800 border-purple-200",
      Concluído: "bg-green-100 text-green-800 border-green-200",
    }
  };

  // Fallback inteligente para datos antiguos en español
  let styleClass = styles[type]?.[value];
  if (!styleClass) {
    if (value === 'Abierto') styleClass = styles.estado.Aberto;
    if (value === 'Completado') styleClass = styles.estado.Concluído;
    if (!styleClass) styleClass = "bg-gray-100 text-gray-800";
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styleClass}`}>
      {value}
    </span>
  );
};


const NotificationToast = ({ title, message, onClose }) => (
  <div className="fixed top-4 right-4 bg-white border-l-4 border-sky-500 shadow-2xl rounded-r px-6 py-4 z-50 animate-[slideIn_0.3s_ease-out] flex items-center gap-4 max-w-md">
    <div className="bg-sky-100 p-2 rounded-full text-sky-600">
      <AlertCircle size={24} />
    </div>
    <div className="flex-1">
      <p className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title || "Novo Pendente!"}</p>
      <p className="text-slate-600 text-sm mt-1">{message}</p>
    </div>
    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded">
      <X size={18} />
    </button>
  </div>
);

// Sonido de notificación (Chime simple)
const NOTIFICATION_SOUND = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
// Nota: El string anterior es un placeholder corto. Usaré un sonido real codificado abajo.
const REAL_NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder muy corto, mejor usaré una función que genere un beep si no tengo un archivo.

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // AUTH STATE
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [authData, setAuthData] = useState({ username: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [hasUsers, setHasUsers] = useState(true); // Assume true initially
  const [usersList, setUsersList] = useState([]); // For Admin view
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'Editor' });

  useEffect(() => {
    const savedUser = localStorage.getItem('eitrion_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing user from local storage", e);
        localStorage.removeItem('eitrion_user');
      }
    }
    checkSystemUsers();
  }, []);

  const checkSystemUsers = async () => {
    try {
      const res = await fetch(`${API_URL.replace('/tasks', '/users')}`);
      const data = await res.json();
      if (data.data && data.data.length === 0) {
        setHasUsers(false);
      } else {
        setHasUsers(true);
        if (user?.role === 'Admin') {
          setUsersList(data.data);
        }
      }
    } catch (err) {
      console.error("Error checking users:", err);
    }
  };

  // Refresh users list when view changes to 'users'
  useEffect(() => {
    if (view === 'users' && user?.role === 'Admin') {
      checkSystemUsers();
    }
  }, [view, user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authView === 'login' ? '/api/login' : '/api/register';

    try {
      const res = await fetch(`http://${window.location.hostname}:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro de autenticação');

      const userData = { id: data.id, name: data.name, username: data.username, role: data.role };
      setUser(userData);
      localStorage.setItem('eitrion_user', JSON.stringify(userData));
      setAuthData({ username: '', password: '', name: '' });
      checkSystemUsers(); // Re-check to update UI state
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Utilizador ${data.username} criado com sucesso!`);
      setNewUser({ name: '', username: '', password: '', role: 'Editor' });
      checkSystemUsers();
    } catch (err) {
      alert("Erro ao criar utilizador: " + err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Tem a certeza que deseja eliminar este utilizador?")) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/users/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Erro ao eliminar");
      checkSystemUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('eitrion_user');
    setView('pending');
  };

  // Notificaciones
  const [notification, setNotification] = useState(null);
  const isFirstLoad = React.useRef(true);
  const audioContextRef = React.useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  //========================================================================
  // ---------------- ESTADOS PARA EDICIÓN DE COMENTARIOS ----------------
  //========================================================================
  const [editingCommentIndex, setEditingCommentIndex] = useState(null);
  const [tempCommentText, setTempCommentText] = useState("");

  const initialFormState = {
    ref: '',
    solicitadoPor: '',
    prioridad: 'Normal',
    estado: 'Aberto',
    titulo: '',
    comentarios: '',
    tags: []
  };
  const [formData, setFormData] = useState(initialFormState);
  const [newComment, setNewComment] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [detailTagInput, setDetailTagInput] = useState('');

  //========================================================================
  // -------------------------- CARGA DE DATOS ---------------------------
  //========================================================================
  useEffect(() => {
    fetchTasks();
  }, []);

  //========================================================================
  // ----------------------------- AUTO-SYNC -----------------------------
  //========================================================================
  useEffect(() => {
    if (isOffline) return;
    const interval = setInterval(() => {
      if (!selectedTask && !isEditing) {
        fetchTasks(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isOffline, selectedTask, isEditing]);

  useEffect(() => {
    if (isOffline) {
      localStorage.setItem('tasks_db', JSON.stringify(tasks));
    }
  }, [tasks, isOffline]);

  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;

      // Resume context if suspended (browser policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      // Helper para reproducir un beep
      const playBeep = (startTime, freq, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Envolvente para evitar clicks
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
        gain.gain.setValueAtTime(0.5, startTime + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (type === 'new') {
        // Doble beep grave (Low Double Beep) - 400Hz (aprox G4)
        playBeep(now, 400, 0.1);
        playBeep(now + 0.15, 400, 0.1);
      } else {
        // Doble beep MÁS grave para seguimiento - 200Hz
        playBeep(now, 200, 0.1);
        playBeep(now + 0.15, 200, 0.1);
      }
    } catch (error) {
      console.error("Error audio:", error);
    }
  };

  const fetchTasks = async (silent = false) => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Server error");

      const jsonData = await response.json();
      if (jsonData.data) {
        setTasks(prev => {
          // Detección de nuevos tickets
          // Detección de nuevos tickets y actualizaciones
          if (!isFirstLoad.current) {
            const currentMap = new Map(prev.map(t => [t.id, t]));
            const newItems = [];
            const updatedItems = [];

            jsonData.data.forEach(task => {
              const oldTask = currentMap.get(task.id);
              if (!oldTask) {
                newItems.push(task);
              } else {
                // Detectar nuevos comentarios (seguimiento)
                if (task.comentariosHistorial && oldTask.comentariosHistorial &&
                  task.comentariosHistorial.length > oldTask.comentariosHistorial.length) {
                  // Verificar que el último comentario NO sea del propio usuario actual (opcional, pero difícil sin auth real)
                  // Por ahora notificamos todo cambio
                  updatedItems.push(task);
                }
              }
            });

            if (newItems.length > 0) {
              const newest = newItems[0];
              setNotification({
                title: "Novo Pendente!",
                message: `${newest.ref} - ${newest.titulo}`,
                id: Date.now()
              });
              playSound('new');
              setTimeout(() => setNotification(null), 5000);
            } else if (updatedItems.length > 0) {
              const lastUpdate = updatedItems[0];
              setNotification({
                title: "Nova Atualização!",
                message: `${lastUpdate.ref} - ${lastUpdate.titulo}`,
                id: Date.now()
              });
              playSound('update');
              setTimeout(() => setNotification(null), 5000);
            }
          }

          isFirstLoad.current = false;

          if (JSON.stringify(prev) !== JSON.stringify(jsonData.data)) {
            return jsonData.data;
          }
          return prev;
        });
        if (!silent) setIsOffline(false);
      }
    } catch (error) {
      if (!silent) {
        console.warn(`No se pudo conectar a ${API_URL}. Usando modo Offline.`);
        setIsOffline(true);
        const saved = localStorage.getItem('tasks_db');
        if (saved) setTasks(JSON.parse(saved));
      }
    }
  };

  const normalizeTag = (text) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const priorityWeight = { 'Alta': 3, 'Média': 2, 'Normal': 1 };

  const updateTaskInBackend = (updatedTask) => {
    const updatedList = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setTasks(updatedList);
    setSelectedTask(updatedTask);

    if (!isOffline) {
      fetch(`${API_URL}/${updatedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      }).catch(err => {
        console.error("Error guardando en servidor:", err);
        setIsOffline(true);
      });
    }
  };
  //========================================================================
  // ----------------------- GENERACIÓN DE PDF -----------------------------
  //========================================================================
  const generatePDF = () => {
    // EN TU PC LOCAL: Descomenta todo este bloque y borra el alert

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Pendentes - Eitrion Task", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);

    const tableData = filteredTasks.map(task => [
      task.ref,
      task.prioridad,
      task.solicitadoPor,
      task.titulo,
      task.comentariosHistorial[0]?.text || "Sem descrição",
      "" // Columna vacía para check manual
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Ref', 'Prioridade', 'Solicitado Por', 'Título', 'Descrição Inicial', 'Ok']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] },
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 10 }
      }
    });
    doc.save('Relatorio_Pendentes.pdf');

    //alert("Para activar el PDF en local: Descomenta las líneas de 'import jsPDF' al inicio y el bloque generatePDF().");
  };

  //========================================================================
  // ------------------------------ EVENTOS ------------------------------
  //========================================================================

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const newTask = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ref: formData.ref || `REF-${Math.floor(Math.random() * 10000)}`,
      solicitadoPor: user?.name || formData.solicitadoPor,
      prioridad: formData.prioridad,
      estado: formData.estado,
      titulo: formData.titulo,
      tags: formData.tags,
      comentariosHistorial: [
        { text: formData.comentarios, date: new Date().toISOString(), author: user?.name || 'Sistema' }
      ]
    };

    if (!isOffline) {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
        if (!res.ok) throw new Error("Error");
        setTasks(prev => [...prev, newTask]);
        finishSave();
      } catch (error) {
        console.error("Fallo al guardar en servidor. Guardando localmente.");
        setIsOffline(true);
        setTasks(prev => [...prev, newTask]);
        finishSave();
      }
    } else {
      setTasks(prev => [...prev, newTask]);
      finishSave();
    }
  };

  const finishSave = () => {
    setFormData(initialFormState);
    setTagInput('');
    //alert(isOffline ? "Registo guardado localmente (Offline)" : "Registo guardado no servidor SQLite");
    // playSound('new'); // REMOVIDO: No sonar para el creador, solo para otros
    setView('pending');
  };

  //========================================================================
  // -------------------------- ELIMINAR TAREA ---------------------------
  //========================================================================
  const handleDeleteTask = async () => {
    if (!window.confirm("Tem a certeza de que pretende eliminar este registo? Esta ação é irreversível.")) return;

    const taskId = selectedTask.id;
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    setSelectedTask(null);

    if (!isOffline) {
      try {
        await fetch(`${API_URL}/${taskId}`, { method: 'DELETE' });
      } catch (err) {
        console.error("Erro ao eliminar do servidor:", err);
        setIsOffline(true);
      }
    }
  };

  //========================================================================
  // -------------------------- EDICIÓN DE TAREA -------------------------
  //========================================================================
  const startEditing = () => {
    setEditFormData({
      ref: selectedTask.ref || "",
      solicitadoPor: selectedTask.solicitadoPor || "",
      titulo: selectedTask.titulo || "",
      descripcionInicial: selectedTask.comentariosHistorial[0]?.text || ""
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const saveEditing = () => {
    const newHistory = [...selectedTask.comentariosHistorial];
    if (newHistory.length > 0) {
      newHistory[0] = { ...newHistory[0], text: editFormData.descripcionInicial };
    } else {
      newHistory.push({ text: editFormData.descripcionInicial, date: new Date().toISOString(), author: user?.name || 'Sistema' });
    }

    const updatedTask = {
      ...selectedTask,
      ref: editFormData.ref,
      solicitadoPor: editFormData.solicitadoPor,
      titulo: editFormData.titulo,
      comentariosHistorial: newHistory
    };
    updateTaskInBackend(updatedTask);
    setIsEditing(false);
  };

  //========================================================================
  // ---------------- GESTIÓN DE COMENTARIOS INDIVIDUALES ----------------
  //========================================================================
  const startEditingComment = (index, currentText) => {
    setEditingCommentIndex(index);
    setTempCommentText(currentText);
  };

  const cancelEditingComment = () => {
    setEditingCommentIndex(null);
    setTempCommentText("");
  };

  const saveComment = (index) => {
    if (!tempCommentText.trim()) return;
    const newHistory = [...selectedTask.comentariosHistorial];
    newHistory[index] = { ...newHistory[index], text: tempCommentText };
    const updatedTask = { ...selectedTask, comentariosHistorial: newHistory };
    updateTaskInBackend(updatedTask);
    setEditingCommentIndex(null);
    setTempCommentText("");
  };

  const deleteComment = (index) => {
    if (!window.confirm("Apagar este comentário?")) return;
    const newHistory = [...selectedTask.comentariosHistorial];
    newHistory.splice(index, 1);
    const updatedTask = { ...selectedTask, comentariosHistorial: newHistory };
    updateTaskInBackend(updatedTask);
    setEditingCommentIndex(null);
  };

  //========================================================================
  // -------------------------- TAGS Y DETALLES --------------------------
  //========================================================================
  const handleAddTagForm = (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    if (formData.tags.length >= 3) return;
    const normalizedTag = normalizeTag(tagInput);
    if (formData.tags.includes(normalizedTag)) return;
    setFormData({ ...formData, tags: [...formData.tags, normalizedTag] });
    setTagInput('');
  };

  const handleRemoveTagForm = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const handleAddTagDetail = () => {
    if (!detailTagInput.trim()) return;
    if (selectedTask.tags && selectedTask.tags.length >= 3) return;
    const currentTags = selectedTask.tags || [];
    const normalizedTag = normalizeTag(detailTagInput);
    if (currentTags.includes(normalizedTag)) return;
    const updated = { ...selectedTask, tags: [...currentTags, normalizedTag] };
    updateTaskInBackend(updated);
    setDetailTagInput('');
  };

  const handleRemoveTagDetail = (tagToRemove) => {
    const updated = { ...selectedTask, tags: selectedTask.tags.filter(t => t !== tagToRemove) };
    updateTaskInBackend(updated);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const updated = {
      ...selectedTask,
      comentariosHistorial: [
        ...selectedTask.comentariosHistorial,
        { text: newComment, date: new Date().toISOString(), author: user?.name || 'Utilizador' }
      ]
    };
    updateTaskInBackend(updated);
    setNewComment('');
  };

  const handleStatusChange = (newStatus) => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, estado: newStatus };
    updateTaskInBackend(updated);
  };

  const handlePriorityChange = (newPriority) => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, prioridad: newPriority };
    updateTaskInBackend(updated);
  };

  //========================================================================
  // ------------------- LÓGICA DE INDICADOR MEJORADA --------------------
  //========================================================================
  const getStatusIndicatorColor = (task) => {
    // 1. Ignorar COMPLETAMENTE si está cerrado/concluido
    if (['Concluído', 'Completado'].includes(task.estado)) return null;

    // 2. Verificar si tiene historial (más de 1 comentario)
    const hasTracking = task.comentariosHistorial && task.comentariosHistorial.length > 1;

    // 3. Si no tiene historial, no hay seguimiento -> no mostramos nada (o morado si quisiéramos)
    // La lógica pedía indicador solo si hay "respuestas de seguimiento"
    if (!hasTracking) return null;

    // 4. Lógica de fechas
    const lastComment = task.comentariosHistorial[task.comentariosHistorial.length - 1];
    // Seguridad si falla la fecha
    if (!lastComment || !lastComment.date) return "bg-purple-600";

    const lastDate = new Date(lastComment.date);
    const now = new Date();

    const isSameDay = lastDate.getDate() === now.getDate() &&
      lastDate.getMonth() === now.getMonth() &&
      lastDate.getFullYear() === now.getFullYear();

    if (isSameDay) {
      return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"; // Hoy
    }

    const diffInHours = (now - lastDate) / (1000 * 60 * 60);
    if (diffInHours < 24) {
      return "bg-orange-500"; // < 24h
    }

    return "bg-purple-600"; // > 24h
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    const normalizedSearchTerm = normalizeTag(searchTerm);

    // Manejo de filtros incluyendo estados antiguos (español)
    if (view === 'pending') {
      result = result.filter(t => t.estado !== 'Concluído' && t.estado !== 'Completado');
    }
    else if (view === 'completed') {
      result = result.filter(t => t.estado === 'Concluído' || t.estado === 'Completado');
    }
    else if (view === 'third_party') {
      result = result.filter(t => t.estado === 'Terceiros' || t.estado === 'Tercero');
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.ref && t.ref.toLowerCase().includes(lowerTerm)) ||
        (t.solicitadoPor && t.solicitadoPor.toLowerCase().includes(lowerTerm)) ||
        (t.titulo && t.titulo.toLowerCase().includes(lowerTerm)) ||
        (t.tags && t.tags.some(tag => tag.includes(normalizedSearchTerm))) ||
        (t.comentariosHistorial && t.comentariosHistorial.length > 0 && t.comentariosHistorial[0].text && t.comentariosHistorial[0].text.toLowerCase().includes(lowerTerm))
      );
    }

    if (view === 'pending') {
      result.sort((a, b) => {
        const diffPriority = priorityWeight[b.prioridad] - priorityWeight[a.prioridad];
        if (diffPriority !== 0) return diffPriority;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [tasks, view, searchTerm]);

  if (!user) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-sky-100 p-4 rounded-full">
              <LayoutDashboard size={40} className="text-sky-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {authView === 'login' ? 'Bem-vindo de volta' : 'Criar Conta'}
          </h2>
          <p className="text-center text-slate-500 mb-8">
            {authView === 'login' ? 'Introduza as suas credenciais' : 'Preencha os dados para se registar'}
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} /> {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authView === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                    placeholder="Ex: João Silva"
                    value={authData.name}
                    onChange={e => setAuthData({ ...authData, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome de Utilizador</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="usuario.exemplo"
                  value={authData.username}
                  onChange={e => setAuthData({ ...authData, username: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="••••••••"
                  value={authData.password}
                  onChange={e => setAuthData({ ...authData, password: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">
              {authView === 'login' ? 'Entrar' : 'Registar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {authView === 'login' ? (
              <>
                {!hasUsers && (
                  <>
                    Não tem conta?{' '}
                    <button onClick={() => { setAuthView('register'); setAuthError(''); }} className="text-sky-600 font-bold hover:underline">
                      Criar conta (Admin)
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button onClick={() => { setAuthView('login'); setAuthError(''); }} className="text-sky-600 font-bold hover:underline">
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {notification && (
        <NotificationToast
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}


      {/* BARRA LATERAL DINÁMICA */}
      <aside
        className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col shadow-xl z-20 transition-all duration-300 ease-in-out`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between h-16">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
              <div className="bg-sky-300 p-1.5 rounded-lg flex-shrink-0">
                <LayoutDashboard size={18} className="text-slate-900" />
              </div>
              <h1 className="font-bold text-base tracking-wide truncate">EITRION TASK</h1>
            </div>
          ) : (
            <div className="mx-auto bg-sky-300 p-2 rounded-lg">
              <span className="font-bold text-slate-900 text-xs">ET</span>
            </div>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title={isSidebarCollapsed ? "Expandir Menu" : "Colapsar Menu"}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div
          className={`
            ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'}
            py-3 text-xs font-bold flex items-center gap-3
            bg-slate-800/50 border-b border-slate-800
            transition-all overflow-hidden whitespace-nowrap
          `}
          title={isOffline ? 'Offline' : 'Online'}
        >
          {!isSidebarCollapsed && <span className="text-white tracking-wider">ESTADO</span>}
          <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${isOffline ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'}`}></div>
        </div>

        <nav className="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden">
          <button
            onClick={() => setView('new')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-lg transition-all ${view === 'new' ? 'bg-sky-300 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            title="Novo Registo"
          >
            <PlusCircle size={20} className="flex-shrink-0" />
            {!isSidebarCollapsed && <span className="ml-3 truncate">Novo Registo</span>}
          </button>

          {!isSidebarCollapsed && <div className="pt-4 pb-2 px-4 text-xs text-slate-500 uppercase font-bold tracking-wider truncate">Menu Principal</div>}
          {isSidebarCollapsed && <div className="h-4"></div>}

          <button
            onClick={() => setView('pending')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-lg transition-all ${view === 'pending' ? 'bg-sky-300 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            title="Pendentes"
          >
            <Clock size={20} className="flex-shrink-0" />
            {!isSidebarCollapsed && <span className="ml-3 truncate">Pendentes</span>}
          </button>

          <button
            onClick={() => setView('third_party')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-lg transition-all ${view === 'third_party' ? 'bg-sky-300 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            title="Em Terceiros"
          >
            <Users size={20} className="flex-shrink-0" />
            {!isSidebarCollapsed && <span className="ml-3 truncate">Em Terceiros</span>}
          </button>

          <button
            onClick={() => setView('completed')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-lg transition-all ${view === 'completed' ? 'bg-sky-300 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            title="Concluídos"
          >
            <CheckCircle size={20} className="flex-shrink-0" />
            {!isSidebarCollapsed && <span className="ml-3 truncate">Concluídos</span>}
          </button>

          {!isSidebarCollapsed && <div className="pt-4 pb-2 px-4 text-xs text-slate-500 uppercase font-bold tracking-wider truncate">Sistema</div>}
          {isSidebarCollapsed && <div className="h-4"></div>}

          <div onClick={() => { setView('all'); setIsSidebarCollapsed(false); }} className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition-colors ${view === 'all' ? 'bg-slate-800 border-r-4 border-sky-500' : ''}`}>
            <Database size={20} className={view === 'all' ? 'text-sky-400' : 'text-slate-400'} />
            {!isSidebarCollapsed && <span className={view === 'all' ? 'text-white font-medium' : 'text-slate-300'}>Todos os Registos</span>}
          </div>

          {user?.role === 'Admin' && (
            <div onClick={() => { setView('users'); setIsSidebarCollapsed(false); }} className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition-colors ${view === 'users' ? 'bg-slate-800 border-r-4 border-sky-500' : ''}`}>
              <Users size={20} className={view === 'users' ? 'text-sky-400' : 'text-slate-400'} />
              {!isSidebarCollapsed && <span className={view === 'users' ? 'text-white font-medium' : 'text-slate-300'}>Utilizadores</span>}
            </div>
          )}
        </nav>

        {!isSidebarCollapsed && (
          <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800 truncate flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 text-sky-400 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-bold">{user.name}</span>
            </div>
            <span className="opacity-75 text-[10px] flex items-center justify-center gap-1">
              {user.role === 'Admin' && <Shield size={10} />} @{user.username}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition-colors mt-2 py-1 px-2 rounded hover:bg-white/5"
            >
              <LogOut size={12} /> Sair
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">

        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-700 truncate max-w-xs md:max-w-none">
            {view === 'new' && 'Criar Novo Ticket'}
            {view === 'pending' && 'Caixa de Pendentes'}
            {view === 'third_party' && 'Aguardando Terceiros'}
            {view === 'completed' && 'Histórico de Concluídos'}
            {view === 'all' && 'Todos os Registos'}
            {view === 'users' && 'Gestão de Utilizadores'}
          </h2>

          <div className="flex items-center gap-4">
            {view === 'pending' && (
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200"
                title="Descarregar relatório em PDF"
              >
                <FileDown size={18} /> <span className="hidden sm:inline">PDF</span>
              </button>
            )}

            {/* <button
              onClick={() => playSound('new')}
              className="flex items-center gap-2 bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-purple-200"
              title="Testar Som"
            >
              <Volume2 size={18} /> <span className="hidden sm:inline">Testar Som</span>
            </button> */}

            {view !== 'new' && view !== 'users' && (
              <div className="relative w-60 sm:w-80 transition-all">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-sky-300 rounded-full text-sm outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          {/* VISTAS DE TABLAS Y FORMULARIO */}
          {view === 'new' ? (
            <div className="max-w-3xl mx-auto">
              <Card className="p-8">
                <form onSubmit={handleSaveTask} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Referência (REF)</label>
                      <input required type="text" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-300 outline-none" value={formData.ref} onChange={e => setFormData({ ...formData, ref: e.target.value })} placeholder="Ex: REQ-2024-001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Solicitado por</label>
                      <input type="text" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-300 outline-none" value={formData.solicitadoPor} onChange={e => setFormData({ ...formData, solicitadoPor: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                      <select tabIndex={-1} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-300 outline-none bg-white" value={formData.prioridad} onChange={e => setFormData({ ...formData, prioridad: e.target.value })}>
                        <option>Normal</option><option>Média</option><option>Alta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estado Inicial</label>
                      <select tabIndex={-1} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-300 outline-none bg-white" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                        <option>Aberto</option><option>Terceiros</option><option>Concluído</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Etiquetas (Máx 3)</label>
                    <div className="flex gap-2 mb-2">
                      <input tabIndex={-1} type="text" className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-300 outline-none text-sm" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTagForm(e)} placeholder="Escreva uma etiqueta e prima Enter..." disabled={formData.tags.length >= 3} />
                      <button tabIndex={-1} type="button" onClick={handleAddTagForm} disabled={!tagInput.trim() || formData.tags.length >= 3} className="px-4 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-50 text-sm font-medium">Adicionar</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, idx) => (
                        <span key={idx} className="bg-sky-100 text-sky-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                          <Tag size={12} /> {tag} <button type="button" onClick={() => handleRemoveTagForm(tag)} className="hover:text-sky-900"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Título (Máx 255)</label>
                    <input required maxLength={255} type="text" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-300 outline-none" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Comentários Iniciais</label>
                    <textarea rows={4} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-300 outline-none resize-none" value={formData.comentarios} onChange={e => setFormData({ ...formData, comentarios: e.target.value })} />
                  </div>
                  <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"><FileText size={18} /> Guardar Registo</button>
                  </div>
                </form>
              </Card>
            </div>
          ) : view === 'users' && user?.role === 'Admin' ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={20} /> Adicionar Utilizador</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
                    <input required type="text" className="w-full p-2 border rounded" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Ex: Ana Silva" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Username</label>
                    <input required type="text" className="w-full p-2 border rounded" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="ana.silva" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Senha</label>
                    <input required type="password" className="w-full p-2 border rounded" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="****" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Cargo</label>
                    <select className="w-full p-2 border rounded bg-white" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="Editor">Editor</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="md:col-span-5 flex justify-end mt-2">
                    <button type="submit" className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition-colors font-medium text-sm">Criar Utilizador</button>
                  </div>
                </form>
              </Card>

              <Card className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Nome</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">Cargo</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(usersList) && usersList.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-400 font-mono text-xs">#{u.id}</td>
                        <td className="p-4 font-medium text-slate-700">{u.name}</td>
                        <td className="p-4 text-slate-500">@{u.username}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                        <td className="p-4 text-right">
                          {u.id !== user.id && (
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-medium w-28">Ref</th>
                    <th className="p-4 font-medium hidden md:table-cell w-24">Prioridade</th>
                    <th className="p-4 font-medium hidden sm:table-cell w-40">Solicitado Por</th>
                    <th className="p-4 font-medium">Título</th>
                    <th className="p-4 font-medium hidden sm:table-cell w-24">Estado</th>
                    <th className="p-4 font-medium hidden md:table-cell w-32">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => {
                      const indicatorColor = getStatusIndicatorColor(task);
                      return (
                        <tr key={task.id} onClick={() => { setSelectedTask(task); setIsEditing(false); }} className="hover:bg-sky-50 cursor-pointer transition-colors group">
                          <td className="p-4 font-mono text-slate-500 font-medium flex items-center gap-3">
                            {indicatorColor && <div className={`w-3 h-3 rounded-full flex-shrink-0 ${indicatorColor}`} />}
                            <span className={!indicatorColor ? "pl-6" : ""}>{task.ref}</span>
                          </td>
                          <td className="p-4 hidden md:table-cell"><Badge type="prioridad" value={task.prioridad} /></td>
                          <td className="p-4 font-medium hidden sm:table-cell">{task.solicitadoPor}</td>
                          <td className="p-4 truncate max-w-xs text-slate-600">
                            <div>{task.titulo}</div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {task.tags.map((t, i) => <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded border border-slate-200">#{t}</span>)}
                              </div>
                            )}
                          </td>
                          <td className="p-4 hidden sm:table-cell"><Badge type="estado" value={task.estado} /></td>
                          <td className="p-4 text-slate-400 text-xs hidden md:table-cell">{new Date(task.createdAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400"><p>Não foram encontrados registos.</p></td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <footer className="bg-white border-t border-slate-200 py-2 text-center text-[10px] text-slate-400 flex-shrink-0">
          Desenvolvido por: Ender Guevara Narea - Todos os direitos reservados © V 1.1
        </footer>

        {/* PANEL DETALLES (CON EDICIÓN Y CLICK FUERA) */}
        {selectedTask && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30 flex justify-end" onClick={() => setSelectedTask(null)}>
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>

              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                <div className="overflow-hidden">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {isEditing ? (
                      <input
                        className="border border-slate-300 rounded p-1 text-lg font-bold w-full"
                        value={editFormData.ref}
                        onChange={(e) => setEditFormData({ ...editFormData, ref: e.target.value })}
                      />
                    ) : selectedTask.ref}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{new Date(selectedTask.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={saveEditing} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors" title="Guardar"><Save size={20} /></button>
                      {(user?.role === 'Admin' || selectedTask.solicitadoPor === user?.name) && (
                        <button onClick={handleDeleteTask} className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-colors" title="Eliminar"><Trash2 size={20} /></button>
                      )}
                      <button onClick={cancelEditing} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors" title="Cancelar"><X size={20} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={startEditing} className="p-2 hover:bg-sky-100 text-slate-500 hover:text-sky-600 rounded-full transition-colors" title="Editar Pedido"><Pencil size={20} /></button>
                      <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">Estado</label>
                    <select className="w-full p-2 border border-slate-200 rounded bg-white text-sm" value={selectedTask.estado} onChange={(e) => handleStatusChange(e.target.value)}>
                      <option>Aberto</option><option>Terceiros</option><option>Concluído</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">Prioridade</label>
                    <select className="w-full p-2 border border-slate-200 rounded bg-white text-sm" value={selectedTask.prioridad} onChange={(e) => handlePriorityChange(e.target.value)}>
                      <option>Normal</option><option>Média</option><option>Alta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 block flex items-center justify-between"><span>Etiquetas ({selectedTask.tags?.length || 0}/3)</span></label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTask.tags && selectedTask.tags.map((tag, idx) => (
                      <span key={idx} className="bg-sky-100 text-sky-800 px-2 py-1 rounded text-xs flex items-center gap-1 group">
                        <Tag size={12} /> {tag} <button onClick={() => handleRemoveTagDetail(tag)} className="text-sky-600 hover:text-red-500"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                  {(!selectedTask.tags || selectedTask.tags.length < 3) && (
                    <div className="flex gap-2">
                      <input type="text" className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-sky-300 outline-none" value={detailTagInput} onChange={e => setDetailTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTagDetail()} placeholder="+ Nova etiqueta" />
                      <button onClick={handleAddTagDetail} disabled={!detailTagInput.trim()} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs"><PlusCircle size={14} /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase text-slate-400 font-bold block">Solicitado Por</label>
                    {isEditing ? (
                      <input className="w-full p-2 border border-slate-300 rounded" value={editFormData.solicitadoPor} onChange={(e) => setEditFormData({ ...editFormData, solicitadoPor: e.target.value })} />
                    ) : <p className="text-slate-800 font-medium text-lg">{selectedTask.solicitadoPor}</p>}
                  </div>
                  <div>
                    <label className="text-xs uppercase text-slate-400 font-bold block">Título</label>
                    {isEditing ? (
                      <input className="w-full p-2 border border-slate-300 rounded" value={editFormData.titulo} onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })} />
                    ) : <p className="text-slate-700">{selectedTask.titulo}</p>}
                  </div>
                  <div>
                    <label className="text-xs uppercase text-slate-400 font-bold block">Descrição Inicial</label>
                    {isEditing ? (
                      <textarea className="w-full p-2 border border-slate-300 rounded h-32 resize-none" value={editFormData.descripcionInicial} onChange={(e) => setEditFormData({ ...editFormData, descripcionInicial: e.target.value })} />
                    ) : <p className="text-slate-700 whitespace-pre-wrap mt-1">{selectedTask.comentariosHistorial[0]?.text || "Sem descrição."}</p>}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4"></div>

                {/* CHAT / SEGUIMIENTO ACTUALIZADO */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex-1 flex flex-col">
                  <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><MessageSquare size={16} /> Seguimento</h4>
                  <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2 flex-1">
                    {selectedTask.comentariosHistorial.slice(1).length > 0 ? (
                      selectedTask.comentariosHistorial.slice(1).map((com, idx) => {
                        // El índice real en el array original es idx + 1 porque hacemos slice(1)
                        const realIndex = idx + 1;
                        const isEditingThisComment = editingCommentIndex === realIndex;

                        return (
                          <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg text-sm group relative">
                            {isEditingThisComment ? (
                              <div className="space-y-2">
                                <textarea
                                  className="w-full p-2 border border-slate-300 rounded resize-none text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                                  rows={3}
                                  value={tempCommentText}
                                  onChange={(e) => setTempCommentText(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => saveComment(realIndex)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Guardar"><Save size={14} /></button>
                                  {(user?.role === 'Admin' || selectedTask.comentariosHistorial[realIndex].author === user?.name) && (
                                    <button onClick={() => deleteComment(realIndex)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Apagar"><Trash2 size={14} /></button>
                                  )}
                                  <button onClick={cancelEditingComment} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" title="Cancelar"><X size={14} /></button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-xs text-slate-600">{com.author}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">
                                      {new Date(com.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {/* Botón Editar Comentario (visible al hacer hover) */}
                                    <button
                                      onClick={() => startEditingComment(realIndex, com.text)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-sky-600"
                                      title="Editar comentário"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-slate-700 whitespace-pre-wrap">{com.text}</p>
                              </>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-sm italic">Ainda não há notas de seguimento.</div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <textarea className="flex-1 p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-sky-300 outline-none resize-none" placeholder="Adicionar nota de seguimento..." rows={1} value={newComment} onChange={e => setNewComment(e.target.value)} />
                    <button onClick={handleAddComment} disabled={!newComment.trim()} className="bg-slate-900 text-white p-2 rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"><Send size={16} /></button>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-center"><p className="text-xs text-slate-400">ID Interno: {selectedTask.id}</p></div>
            </div>
          </div>
        )}
      </main>
    </div >
  );
}