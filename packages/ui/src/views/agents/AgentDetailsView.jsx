import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    Chip,
    Grid,
    Paper,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
    Alert,
    AlertTitle,
    Skeleton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Badge
} from '@mui/material'
import {
    IconArrowLeft,
    IconSettings,
    IconTrash,
    IconRefresh,
    IconApi,
    IconMessageCircle,
    IconChartBar,
    IconHistory,
    IconShieldCheck,
    IconClock,
    IconUsers,
    IconBolt,
    IconCode,
    IconExternalLink,
    IconCopy,
    IconCheck
} from '@tabler/icons-react'

// Components
import AgentInteractionGuide from '../agentcreator/components/AgentInteractionGuide'
import TestAgentInterface from '../agentcreator/components/TestAgentInterface'

// API
import agentsApi from '@/api/agents'

const TabPanel = ({ children, value, index, ...other }) => {
    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`agent-tabpanel-${index}`}
            aria-labelledby={`agent-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </Box>
    )
}

const AgentDetailsView = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [agent, setAgent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState(0)
    const [copied, setCopied] = useState({})
    const [stats, setStats] = useState({
        totalMessages: 0,
        activeSessions: 0,
        avgResponseTime: 0,
        successRate: 0
    })

    useEffect(() => {
        loadAgent()
        loadStats()
    }, [id])

    const loadAgent = async () => {
        try {
            setLoading(true)
            const response = await agentsApi.getAgent(id)
            setAgent(response.data)
        } catch (err) {
            setError(err.message || 'Failed to load agent')
        } finally {
            setLoading(false)
        }
    }

    const loadStats = async () => {
        try {
            const response = await agentsApi.getAgentStats(id)
            setStats(response.data)
        } catch (err) {
            console.error('Failed to load stats:', err)
        }
    }

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text)
        setCopied({ ...copied, [field]: true })
        setTimeout(() => setCopied({ ...copied, [field]: false }), 2000)
    }

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this agent?')) {
            try {
                await agentsApi.deleteAgent(id)
                navigate('/agents')
            } catch (err) {
                setError(err.message || 'Failed to delete agent')
            }
        }
    }

    const handleRefreshApiKey = async () => {
        if (window.confirm('Are you sure you want to regenerate the API key?')) {
            try {
                const response = await agentsApi.regenerateApiKey(id)
                setAgent({ ...agent, apiKey: response.data.apiKey })
            } catch (err) {
                setError(err.message || 'Failed to regenerate API key')
            }
        }
    }

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
                <Skeleton variant="rectangular" height={400} />
            </Box>
        )
    }

    if (error || !agent) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    <AlertTitle>Error</AlertTitle>
                    {error || 'Agent not found'}
                </Alert>
                <Button
                    startIcon={<IconArrowLeft />}
                    onClick={() => navigate('/agents')}
                    sx={{ mt: 2 }}
                >
                    Back to Agents
                </Button>
            </Box>
        )
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <IconButton onClick={() => navigate('/agents')}>
                        <IconArrowLeft />
                    </IconButton>
                    <Box>
                        <Typography variant="h4">{agent.name}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip 
                                label={agent.status || 'Active'} 
                                color="success" 
                                size="small" 
                                icon={<IconCheck />}
                            />
                            <Chip 
                                label={agent.type || 'Custom Agent'} 
                                size="small" 
                                variant="outlined"
                            />
                            <Chip 
                                label={`Created ${new Date(agent.createdAt).toLocaleDateString()}`}
                                size="small"
                                variant="outlined"
                                icon={<IconClock />}
                            />
                        </Stack>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<IconSettings />}
                        onClick={() => navigate(`/agents/${id}/settings`)}
                    >
                        Settings
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<IconTrash />}
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                </Stack>
            </Stack>

            {/* Stats Overview */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="h6">
                                    {stats.totalMessages.toLocaleString()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Messages
                                </Typography>
                            </Box>
                            <IconMessageCircle size={32} style={{ opacity: 0.3 }} />
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="h6">
                                    {stats.activeSessions}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Active Sessions
                                </Typography>
                            </Box>
                            <IconUsers size={32} style={{ opacity: 0.3 }} />
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="h6">
                                    {stats.avgResponseTime}ms
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Avg Response Time
                                </Typography>
                            </Box>
                            <IconBolt size={32} style={{ opacity: 0.3 }} />
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="h6">
                                    {stats.successRate}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Success Rate
                                </Typography>
                            </Box>
                            <IconChartBar size={32} style={{ opacity: 0.3 }} />
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Main Content */}
            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                        <Tab icon={<IconMessageCircle />} label="Test Agent" />
                        <Tab icon={<IconCode />} label="Integration" />
                        <Tab icon={<IconApi />} label="API Details" />
                        <Tab icon={<IconHistory />} label="History" />
                        <Tab icon={<IconChartBar />} label="Analytics" />
                    </Tabs>
                </Box>

                <CardContent>
                    {/* Test Agent Tab */}
                    <TabPanel value={activeTab} index={0}>
                        <TestAgentInterface agent={agent} maxHeight={600} />
                    </TabPanel>

                    {/* Integration Tab */}
                    <TabPanel value={activeTab} index={1}>
                        <AgentInteractionGuide agent={agent} showTestInterface={false} />
                    </TabPanel>

                    {/* API Details Tab */}
                    <TabPanel value={activeTab} index={2}>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    API Configuration
                                </Typography>
                                <List>
                                    <ListItem>
                                        <ListItemIcon>
                                            <IconApi />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Endpoint"
                                            secondary={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ fontFamily: 'monospace' }}
                                                    >
                                                        {agent.endpoint}
                                                    </Typography>
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleCopy(agent.endpoint, 'endpoint')}
                                                    >
                                                        {copied.endpoint ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                                    </IconButton>
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                    <Divider />
                                    <ListItem>
                                        <ListItemIcon>
                                            <IconShieldCheck />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="API Key"
                                            secondary={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ fontFamily: 'monospace' }}
                                                    >
                                                        {agent.apiKey?.slice(0, 20)}...
                                                    </Typography>
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleCopy(agent.apiKey, 'apiKey')}
                                                    >
                                                        {copied.apiKey ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                                    </IconButton>
                                                    <Button
                                                        size="small"
                                                        startIcon={<IconRefresh size={16} />}
                                                        onClick={handleRefreshApiKey}
                                                    >
                                                        Regenerate
                                                    </Button>
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                    <Divider />
                                    <ListItem>
                                        <ListItemIcon>
                                            <IconBolt />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Rate Limit"
                                            secondary={`${agent.rateLimit || 100} requests per minute`}
                                        />
                                    </ListItem>
                                </List>
                            </Box>

                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Configuration
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <pre style={{ margin: 0, overflow: 'auto' }}>
                                        {JSON.stringify(agent.configuration, null, 2)}
                                    </pre>
                                </Paper>
                            </Box>
                        </Stack>
                    </TabPanel>

                    {/* History Tab */}
                    <TabPanel value={activeTab} index={3}>
                        <Alert severity="info">
                            <AlertTitle>Coming Soon</AlertTitle>
                            Conversation history and session analytics will be available here.
                        </Alert>
                    </TabPanel>

                    {/* Analytics Tab */}
                    <TabPanel value={activeTab} index={4}>
                        <Alert severity="info">
                            <AlertTitle>Coming Soon</AlertTitle>
                            Detailed analytics and performance metrics will be displayed here.
                        </Alert>
                    </TabPanel>
                </CardContent>
            </Card>
        </Box>
    )
}

export default AgentDetailsView