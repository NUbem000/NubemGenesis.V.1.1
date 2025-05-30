import React, { useState, useEffect } from 'react'
import {
    Box,
    TextField,
    Typography,
    Button,
    Paper,
    Stack,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Alert,
    CircularProgress,
    Tooltip,
    IconButton
} from '@mui/material'
import { 
    IconSend, 
    IconSparkles, 
    IconBulb,
    IconInfoCircle,
    IconCopy
} from '@tabler/icons-react'

// API
import chatflowsApi from '@/api/chatflows'

const popularExamples = [
    {
        title: "Customer Support Assistant",
        description: "I need an agent that can handle customer inquiries, answer FAQs, and escalate complex issues",
        tags: ["support", "automation", "customer service"]
    },
    {
        title: "Document Analyzer",
        description: "I want to upload PDFs and have an AI extract key information and answer questions about them",
        tags: ["documents", "analysis", "Q&A"]
    },
    {
        title: "Data Processing Agent",
        description: "I need help processing CSV files, analyzing data, and generating insights",
        tags: ["data", "analytics", "automation"]
    },
    {
        title: "Content Creator",
        description: "I want an AI that can help write blog posts, social media content, and marketing copy",
        tags: ["content", "writing", "marketing"]
    }
]

const DescribeNeedStep = ({ onNext, initialValue = '', loading }) => {
    const [description, setDescription] = useState(initialValue)
    const [suggestions, setSuggestions] = useState([])
    const [fetchingSuggestions, setFetchingSuggestions] = useState(false)
    const [showExamples, setShowExamples] = useState(true)

    // Fetch suggestions as user types
    useEffect(() => {
        const timer = setTimeout(() => {
            if (description.length > 20) {
                fetchSuggestions()
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [description])

    const fetchSuggestions = async () => {
        setFetchingSuggestions(true)
        try {
            const response = await chatflowsApi.getAgentSuggestions(description)
            setSuggestions(response.data.suggestions || [])
            setShowExamples(false)
        } catch (error) {
            console.error('Failed to fetch suggestions:', error)
        } finally {
            setFetchingSuggestions(false)
        }
    }

    const handleExampleClick = (example) => {
        setDescription(example.description)
        setShowExamples(false)
    }

    const handleSubmit = () => {
        if (description.trim() && !loading) {
            onNext(description.trim())
        }
    }

    // Auto-submit if we have a prefilled value from a template
    useEffect(() => {
        if (initialValue && initialValue.length > 50) {
            // Give user a moment to see what's happening
            setTimeout(() => {
                handleSubmit()
            }, 1000)
        }
    }, [initialValue])

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconSparkles size={24} />
                    Tell me what you need help with
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Describe your task in your own words. Be specific about what you want your AI agent to do.
                </Typography>
            </Box>

            {/* Main input */}
            <TextField
                fullWidth
                multiline
                rows={6}
                variant="outlined"
                placeholder="For example: I need help managing customer support tickets. The agent should be able to read incoming emails, categorize them by urgency, draft responses for common questions, and escalate complex issues to human agents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        handleSubmit()
                    }
                }}
                disabled={loading}
                sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                        fontSize: '1.1rem',
                        lineHeight: 1.6
                    }
                }}
                InputProps={{
                    endAdornment: fetchingSuggestions && (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                    )
                }}
            />

            {/* Tips */}
            <Alert 
                severity="info" 
                icon={<IconBulb />}
                sx={{ mb: 3 }}
            >
                <strong>Tips for best results:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>Be specific about the tasks you need help with</li>
                    <li>Mention any tools or systems you want to integrate</li>
                    <li>Describe the expected input and output</li>
                </ul>
            </Alert>

            {/* Examples or Suggestions */}
            <Box sx={{ flex: 1, overflow: 'auto', mb: 3 }}>
                {showExamples ? (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconBulb size={18} />
                            Popular use cases
                        </Typography>
                        <Stack spacing={2}>
                            {popularExamples.map((example, index) => (
                                <Paper
                                    key={index}
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                    onClick={() => handleExampleClick(example)}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                {example.title}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {example.description}
                                            </Typography>
                                            <Stack direction="row" spacing={0.5}>
                                                {example.tags.map((tag, i) => (
                                                    <Chip key={i} label={tag} size="small" />
                                                ))}
                                            </Stack>
                                        </Box>
                                        <IconButton size="small">
                                            <IconCopy size={18} />
                                        </IconButton>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </>
                ) : suggestions.length > 0 && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconSparkles size={18} />
                            Similar successful agents
                        </Typography>
                        <List>
                            {suggestions.map((suggestion, index) => (
                                <ListItem key={index} disablePadding>
                                    <ListItemButton onClick={() => setDescription(suggestion.query)}>
                                        <ListItemText
                                            primary={suggestion.title}
                                            secondary={
                                                <Box>
                                                    <Typography variant="caption" component="div">
                                                        {suggestion.description}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                                        {suggestion.tags?.map((tag, i) => (
                                                            <Chip key={i} label={tag} size="small" />
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
            </Box>

            {/* Submit button */}
            <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={!description.trim() || loading}
                endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconSend />}
                sx={{ mt: 'auto' }}
            >
                {loading ? 'Understanding your needs...' : 'Continue'}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Press Ctrl+Enter to continue
            </Typography>
        </Box>
    )
}

export default DescribeNeedStep