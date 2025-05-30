import React, { useState, useRef, useEffect } from 'react'
import {
    Box,
    TextField,
    Button,
    Paper,
    Typography,
    Stack,
    Avatar,
    CircularProgress,
    IconButton,
    Tooltip,
    Chip,
    Divider,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Collapse,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Badge
} from '@mui/material'
import {
    IconSend,
    IconRobot,
    IconUser,
    IconRefresh,
    IconSettings,
    IconChevronDown,
    IconChevronUp,
    IconCopy,
    IconDownload,
    IconBolt,
    IconClock,
    IconShieldCheck,
    IconBug
} from '@tabler/icons-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// API client for agent interaction
class AgentClient {
    constructor(agent) {
        this.agent = agent
        this.baseUrl = agent.endpoint || `/api/v1/agents/${agent.id}`
        this.apiKey = agent.apiKey
    }

    async sendMessage(message, sessionId, options = {}) {
        const response = await fetch(`${this.baseUrl}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                sessionId,
                ...options
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Failed to send message')
        }

        return response.json()
    }

    async streamMessage(message, sessionId, onChunk, options = {}) {
        const response = await fetch(`${this.baseUrl}/chat/stream`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify({
                message,
                sessionId,
                stream: true,
                ...options
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Failed to stream message')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6))
                        onChunk(data)
                    } catch (e) {
                        console.error('Failed to parse chunk:', e)
                    }
                }
            }
        }
    }
}

const MessageBubble = ({ message, isUser }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <ListItem 
            alignItems="flex-start"
            sx={{ 
                flexDirection: isUser ? 'row-reverse' : 'row',
                px: 0
            }}
        >
            <ListItemAvatar sx={{ minWidth: 40, mr: isUser ? 0 : 1, ml: isUser ? 1 : 0 }}>
                <Avatar 
                    sx={{ 
                        bgcolor: isUser ? 'primary.main' : 'secondary.main',
                        width: 32,
                        height: 32
                    }}
                >
                    {isUser ? <IconUser size={18} /> : <IconRobot size={18} />}
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2">
                            {isUser ? 'You' : 'Agent'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {new Date(message.timestamp).toLocaleTimeString()}
                        </Typography>
                        {message.latency && (
                            <Chip 
                                icon={<IconClock size={12} />}
                                label={`${message.latency}ms`}
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                }
                secondary={
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 2, 
                            mt: 0.5,
                            bgcolor: isUser ? 'primary.light' : 'grey.100',
                            color: isUser ? 'primary.contrastText' : 'text.primary',
                            maxWidth: '80%',
                            position: 'relative',
                            '&:hover .copy-button': {
                                opacity: 1
                            }
                        }}
                    >
                        {!isUser && message.content ? (
                            <ReactMarkdown
                                components={{
                                    code({node, inline, className, children, ...props}) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return !inline && match ? (
                                            <SyntaxHighlighter
                                                style={atomDark}
                                                language={match[1]}
                                                PreTag="div"
                                                {...props}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        ) : (
                            <Typography variant="body2">
                                {message.content}
                            </Typography>
                        )}
                        <IconButton
                            className="copy-button"
                            size="small"
                            onClick={handleCopy}
                            sx={{ 
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                opacity: 0,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            <Tooltip title={copied ? "Copied!" : "Copy"}>
                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </Tooltip>
                        </IconButton>
                        {message.confidence && (
                            <Box sx={{ mt: 1 }}>
                                <Chip 
                                    icon={<IconShieldCheck size={14} />}
                                    label={`Confidence: ${Math.round(message.confidence * 100)}%`}
                                    size="small"
                                    color={message.confidence > 0.8 ? 'success' : 'warning'}
                                />
                            </Box>
                        )}
                    </Paper>
                }
            />
        </ListItem>
    )
}

const TestAgentInterface = ({ agent, maxHeight = 500 }) => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [sessionId] = useState(`test-session-${Date.now()}`)
    const [showSettings, setShowSettings] = useState(false)
    const [streaming, setStreaming] = useState(true)
    const [language, setLanguage] = useState('en')
    const [debugMode, setDebugMode] = useState(false)
    const messagesEndRef = useRef(null)
    const client = useRef(null)

    useEffect(() => {
        client.current = new AgentClient(agent)
    }, [agent])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)
        setError(null)

        const startTime = Date.now()

        try {
            if (streaming) {
                // Streaming response
                let streamedContent = ''
                const assistantMessage = {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    isStreaming: true
                }
                setMessages(prev => [...prev, assistantMessage])

                await client.current.streamMessage(
                    userMessage.content,
                    sessionId,
                    (chunk) => {
                        streamedContent += chunk.content || ''
                        setMessages(prev => {
                            const newMessages = [...prev]
                            newMessages[newMessages.length - 1] = {
                                ...assistantMessage,
                                content: streamedContent
                            }
                            return newMessages
                        })
                    },
                    {
                        language,
                        debug: debugMode
                    }
                )

                // Update final message with metadata
                setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = {
                        ...newMessages[newMessages.length - 1],
                        isStreaming: false,
                        latency: Date.now() - startTime
                    }
                    return newMessages
                })
            } else {
                // Regular response
                const response = await client.current.sendMessage(
                    userMessage.content,
                    sessionId,
                    {
                        language,
                        debug: debugMode
                    }
                )

                const assistantMessage = {
                    role: 'assistant',
                    content: response.message,
                    timestamp: new Date().toISOString(),
                    confidence: response.confidence,
                    latency: Date.now() - startTime
                }

                setMessages(prev => [...prev, assistantMessage])
            }
        } catch (err) {
            console.error('Error sending message:', err)
            setError(err.message)
            // Remove the streaming message if it exists
            setMessages(prev => {
                if (prev[prev.length - 1]?.isStreaming) {
                    return prev.slice(0, -1)
                }
                return prev
            })
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleReset = () => {
        setMessages([])
        setError(null)
    }

    const handleExport = () => {
        const exportData = {
            agent: {
                id: agent.id,
                name: agent.name
            },
            sessionId,
            messages,
            timestamp: new Date().toISOString()
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agent-test-${sessionId}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Badge 
                        color="success" 
                        variant="dot" 
                        invisible={!agent.deployed}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            <IconRobot size={20} />
                        </Avatar>
                    </Badge>
                    <Box>
                        <Typography variant="subtitle2">
                            {agent.name || 'Test Agent'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Session: {sessionId.slice(0, 20)}...
                        </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Export conversation">
                        <IconButton size="small" onClick={handleExport} disabled={messages.length === 0}>
                            <IconDownload size={18} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset conversation">
                        <IconButton size="small" onClick={handleReset} disabled={messages.length === 0}>
                            <IconRefresh size={18} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Settings">
                        <IconButton size="small" onClick={() => setShowSettings(!showSettings)}>
                            {showSettings ? <IconChevronUp size={18} /> : <IconSettings size={18} />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Settings Panel */}
            <Collapse in={showSettings}>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={streaming}
                                        onChange={(e) => setStreaming(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label={
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <IconBolt size={16} />
                                        <Typography variant="body2">Streaming</Typography>
                                    </Stack>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={debugMode}
                                        onChange={(e) => setDebugMode(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label={
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <IconBug size={16} />
                                        <Typography variant="body2">Debug</Typography>
                                    </Stack>
                                }
                            />
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Language</InputLabel>
                                <Select
                                    value={language}
                                    label="Language"
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    <MenuItem value="en">English</MenuItem>
                                    <MenuItem value="es">Español</MenuItem>
                                    <MenuItem value="fr">Français</MenuItem>
                                    <MenuItem value="de">Deutsch</MenuItem>
                                    <MenuItem value="pt">Português</MenuItem>
                                    <MenuItem value="zh">中文</MenuItem>
                                    <MenuItem value="ja">日本語</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                        {debugMode && (
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                <Typography variant="caption">
                                    Debug mode enabled. Additional diagnostic information will be included in responses.
                                </Typography>
                            </Alert>
                        )}
                    </Stack>
                </Paper>
            </Collapse>

            {/* Messages Area */}
            <Paper 
                variant="outlined" 
                sx={{ 
                    flex: 1, 
                    overflow: 'auto',
                    maxHeight,
                    bgcolor: 'background.default',
                    p: 2
                }}
            >
                {messages.length === 0 ? (
                    <Box
                        sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center'
                        }}
                    >
                        <Box>
                            <IconMessageCircle size={48} style={{ opacity: 0.3 }} />
                            <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                                Start Testing Your Agent
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Send a message to see how your agent responds
                            </Typography>
                            {agent.description && (
                                <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                                    <Typography variant="caption">
                                        <strong>Agent Description:</strong> {agent.description}
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    </Box>
                ) : (
                    <List sx={{ py: 0 }}>
                        {messages.map((message, index) => (
                            <MessageBubble 
                                key={index} 
                                message={message} 
                                isUser={message.role === 'user'}
                            />
                        ))}
                        {loading && (
                            <ListItem alignItems="flex-start">
                                <ListItemAvatar sx={{ minWidth: 40 }}>
                                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                        <IconRobot size={18} />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary="Agent"
                                    secondary={
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <CircularProgress size={16} />
                                            <Typography variant="body2" color="text.secondary">
                                                {streaming ? 'Streaming response...' : 'Thinking...'}
                                            </Typography>
                                        </Stack>
                                    }
                                />
                            </ListItem>
                        )}
                        <div ref={messagesEndRef} />
                    </List>
                )}
            </Paper>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Input Area */}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here..."
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper'
                        }
                    }}
                />
                <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    sx={{ minWidth: 100 }}
                    startIcon={loading ? <CircularProgress size={18} /> : <IconSend size={18} />}
                >
                    Send
                </Button>
            </Stack>
        </Box>
    )
}

export default TestAgentInterface