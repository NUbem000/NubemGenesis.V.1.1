import React, { useState, useEffect } from 'react'
import {
    Box,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Card,
    CardContent,
    Chip,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Checkbox,
    FormGroup,
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Tooltip,
    Paper,
    Divider
} from '@mui/material'
import {
    ArrowBack,
    ArrowForward,
    AutoAwesome,
    ContentCopy,
    CheckCircle,
    Error as ErrorIcon,
    Info as InfoIcon,
    LightbulbOutlined,
    TipsAndUpdates
} from '@mui/icons-material'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import chatflowsApi from '@/api/chatflows'

const CreateFlowWizard = ({ open, onClose, onFlowCreated }) => {
    const dispatch = useDispatch()
    const [activeStep, setActiveStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [suggestions, setSuggestions] = useState([])
    
    // Form data
    const [query, setQuery] = useState('')
    const [clarifications, setClarifications] = useState({})
    const [needsClarification, setNeedsClarification] = useState(false)
    const [questions, setQuestions] = useState([])
    const [suggestedUseCases, setSuggestedUseCases] = useState([])
    const [generatedFlow, setGeneratedFlow] = useState(null)
    const [flowName, setFlowName] = useState('')
    
    const steps = ['Describe your agent', 'Clarify requirements', 'Review & Create']
    
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    // Fetch suggestions as user types
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 10) {
                fetchSuggestions()
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [query])

    const fetchSuggestions = async () => {
        try {
            const response = await chatflowsApi.get(`/api/v2/orchestrate/suggestions?query=${encodeURIComponent(query)}`)
            setSuggestions(response.data.suggestions || [])
        } catch (error) {
            console.error('Failed to fetch suggestions:', error)
        }
    }

    const handleQuerySubmit = async () => {
        if (!query.trim()) {
            enqueueSnackbar({
                message: 'Please describe what you want your agent to do',
                options: { variant: 'warning' }
            })
            return
        }

        setLoading(true)
        try {
            const response = await chatflowsApi.post('/api/v2/orchestrate/orchestrate', {
                query,
                constraints: {
                    preferredModels: ['gpt-4', 'claude-3'],
                    maxCost: 0.50
                }
            })

            if (response.data.needsClarification) {
                setNeedsClarification(true)
                setQuestions(response.data.questions || [])
                setSuggestedUseCases(response.data.suggestions || [])
                setActiveStep(1)
            } else {
                // Flow generated directly
                setGeneratedFlow(response.data.flow)
                setFlowName(response.data.explanation?.substring(0, 50) + '...')
                setActiveStep(2)
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to process request: ${error.message}`,
                options: { variant: 'error' }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleClarificationSubmit = async () => {
        setLoading(true)
        try {
            // Convert clarifications to the expected format
            const clarificationAnswers = Object.entries(clarifications).map(([questionId, values]) => ({
                questionId,
                values: Array.isArray(values) ? values : [values]
            }))

            const response = await chatflowsApi.post('/api/v2/orchestrate/orchestrate', {
                query,
                clarifications: clarificationAnswers,
                constraints: {
                    preferredModels: ['gpt-4', 'claude-3'],
                    maxCost: 0.50
                }
            })

            if (response.data.flow) {
                setGeneratedFlow(response.data.flow)
                setFlowName(response.data.explanation?.substring(0, 50) + '...')
                setActiveStep(2)
            } else {
                throw new Error('No flow generated')
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to generate flow: ${error.message}`,
                options: { variant: 'error' }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateFlow = async () => {
        if (!generatedFlow) return

        setLoading(true)
        try {
            const response = await chatflowsApi.post('/api/v1/chatflows', {
                name: flowName || `AI Agent: ${query.substring(0, 30)}...`,
                flowData: JSON.stringify(generatedFlow),
                deployed: false,
                isPublic: false,
                category: 'AI Generated'
            })

            // Provide feedback for learning
            await chatflowsApi.post('/api/v2/orchestrate/feedback', {
                flowId: response.data.id,
                rating: 5,
                performance: {
                    componentsUsed: generatedFlow.nodes?.map(n => n.data?.name) || []
                }
            })

            enqueueSnackbar({
                message: 'Flow created successfully!',
                options: { variant: 'success' }
            })

            if (onFlowCreated) {
                onFlowCreated(response.data)
            }
            handleClose()
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to create flow: ${error.message}`,
                options: { variant: 'error' }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setActiveStep(0)
        setQuery('')
        setClarifications({})
        setNeedsClarification(false)
        setQuestions([])
        setSuggestedUseCases([])
        setGeneratedFlow(null)
        setFlowName('')
        onClose()
    }

    const handleUseSuggestion = (suggestion) => {
        setQuery(suggestion.query)
    }

    const renderStep1 = () => (
        <Box sx={{ minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
                Describe what you want your AI agent to do
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Be specific about the tasks, data sources, and expected outputs. Our AI will understand and create the perfect flow for you.
            </Typography>
            
            <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder="Example: I need an agent that can read PDF documents, extract key information, and answer questions about the content"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 3 }}
            />

            {suggestions.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        <LightbulbOutlined sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Similar use cases:
                    </Typography>
                    <List dense>
                        {suggestions.map((suggestion, index) => (
                            <ListItem key={index} sx={{ pl: 0 }}>
                                <ListItemText
                                    primary={suggestion.title}
                                    secondary={
                                        <Box>
                                            <Typography variant="caption" component="div">
                                                {suggestion.description}
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                {suggestion.tags?.map((tag, i) => (
                                                    <Chip 
                                                        key={i} 
                                                        label={tag} 
                                                        size="small" 
                                                        sx={{ mr: 0.5, mb: 0.5 }} 
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <Tooltip title="Use this example">
                                        <IconButton 
                                            edge="end" 
                                            onClick={() => handleUseSuggestion(suggestion)}
                                        >
                                            <ContentCopy />
                                        </IconButton>
                                    </Tooltip>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleQuerySubmit}
                    disabled={!query.trim() || loading}
                    endIcon={loading ? <CircularProgress size={20} /> : <ArrowForward />}
                >
                    {loading ? 'Analyzing...' : 'Continue'}
                </Button>
            </Box>
        </Box>
    )

    const renderStep2 = () => (
        <Box sx={{ minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
                Let's clarify a few things to create the perfect agent
            </Typography>
            
            {suggestedUseCases.length > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        We found similar successful use cases:
                    </Typography>
                    {suggestedUseCases.map((useCase, index) => (
                        <Box key={index} sx={{ mt: 1 }}>
                            <Typography variant="body2">
                                <strong>{useCase.title}</strong> ({useCase.similarity}% match)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {useCase.description}
                            </Typography>
                        </Box>
                    ))}
                </Alert>
            )}

            <Box sx={{ mt: 3 }}>
                {questions.map((question) => (
                    <Paper key={question.id} sx={{ p: 2, mb: 2 }}>
                        <FormControl component="fieldset" fullWidth>
                            <FormLabel component="legend" sx={{ mb: 1 }}>
                                {question.question}
                                {question.required && <span style={{ color: 'red' }}> *</span>}
                            </FormLabel>
                            
                            {question.multiSelect ? (
                                <FormGroup>
                                    {question.options.map((option) => (
                                        <FormControlLabel
                                            key={option.value}
                                            control={
                                                <Checkbox
                                                    checked={clarifications[question.id]?.includes(option.value) || false}
                                                    onChange={(e) => {
                                                        const current = clarifications[question.id] || []
                                                        if (e.target.checked) {
                                                            setClarifications({
                                                                ...clarifications,
                                                                [question.id]: [...current, option.value]
                                                            })
                                                        } else {
                                                            setClarifications({
                                                                ...clarifications,
                                                                [question.id]: current.filter(v => v !== option.value)
                                                            })
                                                        }
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    {option.label}
                                                    {option.popular && (
                                                        <Chip 
                                                            label="Popular" 
                                                            size="small" 
                                                            color="primary" 
                                                            sx={{ ml: 1 }} 
                                                        />
                                                    )}
                                                </Box>
                                            }
                                        />
                                    ))}
                                </FormGroup>
                            ) : (
                                <RadioGroup
                                    value={clarifications[question.id] || ''}
                                    onChange={(e) => setClarifications({
                                        ...clarifications,
                                        [question.id]: e.target.value
                                    })}
                                >
                                    {question.options.map((option) => (
                                        <FormControlLabel
                                            key={option.value}
                                            value={option.value}
                                            control={<Radio />}
                                            label={
                                                <Box>
                                                    {option.label}
                                                    {option.popular && (
                                                        <Chip 
                                                            label="Popular" 
                                                            size="small" 
                                                            color="primary" 
                                                            sx={{ ml: 1 }} 
                                                        />
                                                    )}
                                                </Box>
                                            }
                                        />
                                    ))}
                                </RadioGroup>
                            )}
                        </FormControl>
                    </Paper>
                ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button onClick={() => setActiveStep(0)} startIcon={<ArrowBack />}>
                    Back
                </Button>
                <Button
                    variant="contained"
                    onClick={handleClarificationSubmit}
                    disabled={loading}
                    endIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
                >
                    {loading ? 'Generating...' : 'Generate Flow'}
                </Button>
            </Box>
        </Box>
    )

    const renderStep3 = () => (
        <Box sx={{ minHeight: 400 }}>
            <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
                Your AI agent flow has been generated successfully!
            </Alert>
            
            <Typography variant="h6" gutterBottom>
                Review your generated flow
            </Typography>
            
            <TextField
                fullWidth
                label="Flow Name"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                sx={{ mb: 3 }}
            />

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Flow Summary:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {generatedFlow?.nodes?.length || 0} components configured
                </Typography>
                <Box sx={{ mt: 1 }}>
                    {generatedFlow?.nodes?.slice(0, 5).map((node, i) => (
                        <Chip 
                            key={i} 
                            label={node.data?.label || node.data?.name} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }} 
                        />
                    ))}
                    {generatedFlow?.nodes?.length > 5 && (
                        <Chip 
                            label={`+${generatedFlow.nodes.length - 5} more`} 
                            size="small" 
                            variant="outlined"
                        />
                    )}
                </Box>
            </Paper>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
                <Typography variant="body2">
                    You can further customize this flow after creation using our visual editor.
                </Typography>
            </Alert>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleCreateFlow}
                    disabled={loading}
                    endIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                >
                    {loading ? 'Creating...' : 'Create Flow'}
                </Button>
            </Box>
        </Box>
    )

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesome color="primary" />
                    <Typography variant="h6">Create AI Agent with Natural Language</Typography>
                </Box>
            </DialogTitle>
            
            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && renderStep1()}
                {activeStep === 1 && renderStep2()}
                {activeStep === 2 && renderStep3()}
            </DialogContent>
        </Dialog>
    )
}

export default CreateFlowWizard