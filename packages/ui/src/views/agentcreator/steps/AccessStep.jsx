import React, { useState } from 'react'
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Stack,
    Paper,
    IconButton,
    Tooltip,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Alert,
    TextField,
    InputAdornment
} from '@mui/material'
import { 
    IconCheck,
    IconCopy,
    IconExternalLink,
    IconKey,
    IconApi,
    IconChevronDown,
    IconBrandPython,
    IconBrandJavascript,
    IconTerminal2,
    IconMessageCircle,
    IconBook,
    IconRocket,
    IconEye,
    IconEyeOff
} from '@tabler/icons-react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// Components
import CodeBlock from '@/ui-component/markdown/CodeBlock'
import CopyToClipboardButton from '@/ui-component/button/CopyToClipboardButton'

// Store
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

const QuickStartExample = ({ language, code }) => {
    return (
        <Box sx={{ mt: 2 }}>
            <CodeBlock language={language}>
                {code}
            </CodeBlock>
        </Box>
    )
}

const AccessStep = ({ agent, onClose }) => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [showApiKey, setShowApiKey] = useState(false)
    const [activeTab, setActiveTab] = useState(0)
    const [copied, setCopied] = useState({})

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text)
        setCopied({ ...copied, [field]: true })
        setTimeout(() => setCopied({ ...copied, [field]: false }), 2000)
        enqueueSnackbar({
            message: `${field} copied to clipboard`,
            options: { variant: 'success' }
        })
    }

    const handleTestAgent = () => {
        navigate(`/chatbot/${agent.id}`)
    }

    const handleViewDashboard = () => {
        navigate(`/canvas/${agent.id}`)
    }

    const quickStartExamples = {
        curl: `curl -X POST ${agent.endpoint}/chat \\
  -H "Authorization: Bearer ${agent.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello, can you help me?",
    "session_id": "user-123"
  }'`,
        python: `import requests

url = "${agent.endpoint}/chat"
headers = {
    "Authorization": "Bearer ${agent.apiKey}",
    "Content-Type": "application/json"
}
data = {
    "message": "Hello, can you help me?",
    "session_id": "user-123"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`,
        javascript: `const response = await fetch('${agent.endpoint}/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${agent.apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello, can you help me?',
    session_id: 'user-123'
  })
});

const data = await response.json();
console.log(data);`
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Success Celebration */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: 'success.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2
                    }}
                >
                    <IconCheck size={40} color="white" />
                </Box>
                <Typography variant="h4" gutterBottom>
                    Your agent is live!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {agent.name} is ready to use. Here's everything you need to get started.
                </Typography>
            </Box>

            {/* Access Details Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Access Details
                    </Typography>
                    
                    <Stack spacing={3}>
                        {/* API Endpoint */}
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                API Endpoint
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconApi size={20} opacity={0.6} />
                                    <Typography
                                        variant="body2"
                                        sx={{ 
                                            flex: 1, 
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all'
                                        }}
                                    >
                                        {agent.endpoint}
                                    </Typography>
                                    <Tooltip title={copied.endpoint ? "Copied!" : "Copy endpoint"}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleCopy(agent.endpoint, 'endpoint')}
                                        >
                                            {copied.endpoint ? <IconCheck size={18} /> : <IconCopy size={18} />}
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Paper>
                        </Box>

                        {/* API Key */}
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                API Key
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconKey size={20} opacity={0.6} />
                                    <TextField
                                        variant="standard"
                                        value={agent.apiKey}
                                        type={showApiKey ? 'text' : 'password'}
                                        InputProps={{
                                            readOnly: true,
                                            disableUnderline: true,
                                            style: { fontFamily: 'monospace' },
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Stack direction="row" spacing={0.5}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setShowApiKey(!showApiKey)}
                                                        >
                                                            {showApiKey ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                                        </IconButton>
                                                        <Tooltip title={copied.apiKey ? "Copied!" : "Copy API key"}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleCopy(agent.apiKey, 'apiKey')}
                                                            >
                                                                {copied.apiKey ? <IconCheck size={18} /> : <IconCopy size={18} />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </InputAdornment>
                                            )
                                        }}
                                        fullWidth
                                    />
                                </Stack>
                            </Paper>
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                <Typography variant="caption">
                                    Keep this API key secure. You can regenerate it anytime from the dashboard.
                                </Typography>
                            </Alert>
                        </Box>

                        {/* Additional Info */}
                        <Stack direction="row" spacing={2}>
                            <Chip 
                                icon={<IconCheck />} 
                                label="Active" 
                                color="success" 
                                size="small" 
                            />
                            <Chip 
                                label={`Created ${new Date(agent.createdAt).toLocaleDateString()}`}
                                size="small"
                                variant="outlined"
                            />
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<IconChevronDown />}>
                    <Typography variant="h6">Quick Start Guide</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box>
                        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                            <Tab icon={<IconTerminal2 />} label="cURL" />
                            <Tab icon={<IconBrandPython />} label="Python" />
                            <Tab icon={<IconBrandJavascript />} label="JavaScript" />
                        </Tabs>
                        
                        {activeTab === 0 && (
                            <QuickStartExample language="bash" code={quickStartExamples.curl} />
                        )}
                        {activeTab === 1 && (
                            <QuickStartExample language="python" code={quickStartExamples.python} />
                        )}
                        {activeTab === 2 && (
                            <QuickStartExample language="javascript" code={quickStartExamples.javascript} />
                        )}
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Next Steps */}
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Next Steps
                </Typography>
                <List>
                    <ListItem>
                        <ListItemIcon>
                            <IconMessageCircle />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Test your agent"
                            secondary="Try out your agent in the chat interface"
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <IconApi />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Integrate with your app"
                            secondary="Use the API to add AI capabilities to your application"
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <IconBook />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Read the documentation"
                            secondary="Learn about advanced features and best practices"
                        />
                    </ListItem>
                </List>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 3 }}>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleTestAgent}
                    startIcon={<IconMessageCircle />}
                >
                    Test Agent
                </Button>
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleViewDashboard}
                    startIcon={<IconRocket />}
                >
                    View Dashboard
                </Button>
            </Stack>

            <Button
                variant="text"
                fullWidth
                onClick={onClose}
                sx={{ mt: 2 }}
            >
                Done
            </Button>
        </Box>
    )
}

export default AccessStep