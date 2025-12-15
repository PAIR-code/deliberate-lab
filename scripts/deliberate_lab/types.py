# pyright: reportInvalidTypeForm=false
# pylint: disable=missing-module-docstring,missing-class-docstring,invalid-name,too-few-public-methods

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel, confloat, conint, constr


class CollectionName(Enum):
    experimentTemplates = "experimentTemplates"
    experiments = "experiments"


class Metadata(BaseModel):
    name: str
    publicName: str
    description: str
    tags: List[str]


class Visibility(Enum):
    public = "public"
    private = "private"


class Permissions(BaseModel):
    visibility: Visibility
    readers: List[str]


class ProlificConfig(BaseModel):
    enableProlificIntegration: bool
    defaultRedirectCode: str
    attentionFailRedirectCode: str
    bootedRedirectCode: str


class CohortDefinition(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    alias: constr(min_length=1)
    name: constr(min_length=1)
    description: str | None = None
    generatedCohortId: str | None = None


class ParsedItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    date: constr(min_length=1)
    close: float


class CustomCard(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    title: str
    value: str
    subtext: str
    enabled: bool


class Stock(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    name: constr(min_length=1)
    description: str
    csvData: str
    parsedData: List[ParsedItem]
    customCards: List[CustomCard]


class ChipItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    name: str
    avatar: str
    canBuy: bool
    canSell: bool
    startingQuantity: float
    lowerValue: float
    upperValue: float


class MultipleChoiceItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    imageId: str
    text: str


class FlipCard(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    title: str
    frontContent: constr(min_length=1)
    backContent: constr(min_length=1)


class Currency(Enum):
    EUR = "EUR"
    GBP = "GBP"
    USD = "USD"


class DefaultPayoutItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: Literal["DEFAULT"] = "DEFAULT"
    name: str
    description: str
    isActive: bool
    stageId: str
    baseCurrencyAmount: float
    randomSelectionId: str


class ChipPayoutItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: Literal["CHIP"] = "CHIP"
    name: str
    description: str
    isActive: bool
    stageId: str
    baseCurrencyAmount: float


class SurveyPayoutItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: Literal["SURVEY"] = "SURVEY"
    name: str
    description: str
    isActive: bool
    stageId: str
    baseCurrencyAmount: float
    rankingStageId: str | None = None
    questionMap: Dict[constr(pattern=r"^(.*)$"), float | None] = Field(
        ..., title="QuestionMap"
    )


class Strategy(Enum):
    none = "none"
    condorcet = "condorcet"


RankingItem = MultipleChoiceItem


class ComparisonOperator(Enum):
    equals = "equals"
    not_equals = "not_equals"
    greater_than = "greater_than"
    greater_than_or_equal = "greater_than_or_equal"
    less_than = "less_than"
    less_than_or_equal = "less_than_or_equal"
    contains = "contains"
    not_contains = "not_contains"


class ConditionTargetReference(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    stageId: constr(min_length=1)
    questionId: constr(min_length=1)


class ConditionOperator(Enum):
    and_ = "and"
    or_ = "or"


class CohortParticipantConfig(BaseModel):
    minParticipantsPerCohort: conint(ge=0) | None = None
    maxParticipantsPerCohort: conint(ge=1) | None = None
    includeAllParticipantsInCohortCount: bool
    botProtection: bool


class SurveyAutoTransferConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["survey"] = "survey"
    autoCohortParticipantConfig: CohortParticipantConfig
    surveyStageId: constr(min_length=1)
    surveyQuestionId: constr(min_length=1)
    participantCounts: Dict[constr(pattern=r"^(.*)$"), conint(ge=1)] = Field(
        ..., title="ParticipantCounts"
    )


class Scope(Enum):
    experiment = "experiment"
    cohort = "cohort"
    participant = "participant"


class String(BaseModel):
    model_config = ConfigDict(
        extra="allow",
    )
    type: Literal["string"] = "string"


class Number(BaseModel):
    model_config = ConfigDict(
        extra="allow",
    )
    type: Literal["number"] = "number"


class Integer(BaseModel):
    model_config = ConfigDict(
        extra="allow",
    )
    type: Literal["integer"] = "integer"


class Boolean(BaseModel):
    model_config = ConfigDict(
        extra="allow",
    )
    type: Literal["boolean"] = "boolean"


class Seed(Enum):
    experiment = "experiment"
    cohort = "cohort"
    participant = "participant"
    custom = "custom"


class ShuffleConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    shuffle: bool
    seed: Seed
    customSeed: str


class BalanceStrategy(Enum):
    round_robin = "round_robin"
    random = "random"


class BalanceAcross(Enum):
    experiment = "experiment"
    cohort = "cohort"


class ApiKeyType(Enum):
    GEMINI = "GEMINI"
    OPENAI = "OPENAI"
    CLAUDE = "CLAUDE"
    OLLAMA = "OLLAMA"


class AgentModelSettings(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    apiType: ApiKeyType = Field(..., title="ApiKeyType")
    modelName: str


class ChatStageType(Enum):
    chat = "chat"
    privateChat = "privateChat"


class ReasoningLevel(Enum):
    off = "off"
    minimal = "minimal"
    low = "low"
    medium = "medium"
    high = "high"


class CustomRequestBodyField(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str
    value: str


class GoogleThinkingLevel(Enum):
    minimal = "minimal"
    low = "low"
    medium = "medium"
    high = "high"


class GoogleThinkingConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    thinkingBudget: int | None = None
    includeThoughts: bool | None = None
    thinkingLevel: GoogleThinkingLevel | None = Field(None, title="GoogleThinkingLevel")


class GoogleSafetyCategory(Enum):
    HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT"
    HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT"
    HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH"
    HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT"
    HARM_CATEGORY_CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY"


class GoogleSafetyThreshold(Enum):
    BLOCK_NONE = "BLOCK_NONE"
    BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH"
    BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE"
    BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE"
    HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED"


class GoogleSafetySetting(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    category: GoogleSafetyCategory = Field(..., title="GoogleSafetyCategory")
    threshold: GoogleSafetyThreshold = Field(..., title="GoogleSafetyThreshold")


class ReasoningEffort(Enum):
    low = "low"
    medium = "medium"
    high = "high"


class AnthropicThinkingType(Enum):
    enabled = "enabled"
    disabled = "disabled"


class AnthropicThinkingConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: AnthropicThinkingType = Field(..., title="AnthropicThinkingType")
    budgetTokens: int | None = None


class AnthropicCacheTtl(Enum):
    field_5m = "5m"
    field_1h = "1h"


class AnthropicCacheControl(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["ephemeral"] = "ephemeral"
    ttl: AnthropicCacheTtl | None = Field(None, title="AnthropicCacheTtl")


class OpenAIProviderOptions(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    reasoningEffort: ReasoningEffort | None = Field(None, title="ReasoningEffort")
    parallelToolCalls: bool | None = None


class OllamaProviderOptions(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    numCtx: int | None = None
    numPredict: int | None = None


class StructuredOutputType(Enum):
    NONE = "NONE"
    JSON_FORMAT = "JSON_FORMAT"
    JSON_SCHEMA = "JSON_SCHEMA"


class StructuredOutputDataType(Enum):
    STRING = "STRING"
    NUMBER = "NUMBER"
    INTEGER = "INTEGER"
    BOOLEAN = "BOOLEAN"
    ARRAY = "ARRAY"
    OBJECT = "OBJECT"
    ENUM = "ENUM"


class AgentChatSettings(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    wordsPerMinute: float | None = None
    minMessagesBeforeResponding: int
    canSelfTriggerCalls: bool
    maxResponses: int | None = None
    initialMessage: str


class StageKind(Enum):
    info = "info"
    tos = "tos"
    profile = "profile"
    chat = "chat"
    chip = "chip"
    comprehension = "comprehension"
    flipcard = "flipcard"
    ranking = "ranking"
    payout = "payout"
    privateChat = "privateChat"
    reveal = "reveal"
    salesperson = "salesperson"
    stockinfo = "stockinfo"
    assetAllocation = "assetAllocation"
    multiAssetAllocation = "multiAssetAllocation"
    role = "role"
    survey = "survey"
    surveyPerParticipant = "surveyPerParticipant"
    transfer = "transfer"


class StockConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    stockInfoStageId: constr(min_length=1) | None = None
    stockA: Stock
    stockB: Stock


class TextQuestion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["text"] = "text"
    questionTitle: str
    correctAnswer: str


class McQuestion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["mc"] = "mc"
    questionTitle: str
    options: List[MultipleChoiceItem]
    correctAnswerId: str


class ProfileType(Enum):
    DEFAULT = "DEFAULT"
    DEFAULT_GENDERED = "DEFAULT_GENDERED"
    ANONYMOUS_ANIMAL = "ANONYMOUS_ANIMAL"
    ANONYMOUS_PARTICIPANT = "ANONYMOUS_PARTICIPANT"


class Role(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    name: str
    displayLines: List[str]
    minParticipants: int
    maxParticipants: int | None = None


class StageProgressConfig(RootModel[Any]):
    root: Any


class StageTextConfig(StageProgressConfig):
    pass


class CohortConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    alias: str | None = None
    metadata: Metadata = Field(..., title="Metadata")
    participantConfig: CohortParticipantConfig
    stageUnlockMap: Dict[constr(pattern=r"^(.*)$"), bool] = Field(
        ..., title="StageUnlockMap"
    )
    variableMap: Dict[constr(pattern=r"^(.*)$"), str] | None = Field(
        None, title="VariableMap"
    )


class CohortCreation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    experimentId: constr(min_length=1)
    cohortConfig: CohortConfig = Field(..., title="CohortConfig")


class CohortUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    experimentId: constr(min_length=1)
    cohortId: constr(min_length=1)
    metadata: Metadata = Field(..., title="Metadata")
    participantConfig: CohortParticipantConfig


class ChatStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    kind: Literal["chat"] = "chat"
    name: str
    descriptions: Any
    progress: Any
    timeLimitInMinutes: float | None = None
    requireFullTime: bool | None = None


class ChipStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    kind: Literal["chip"] = "chip"
    name: str
    descriptions: Any
    progress: Any
    enableChat: bool
    numRounds: float
    chips: List[ChipItem]


class FlipCardStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["flipcard"] = "flipcard"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    cards: List[FlipCard]
    enableSelection: bool
    allowMultipleSelections: bool
    requireConfirmation: bool
    minUniqueCardsFlippedRequirement: float
    shuffleCards: bool


class InfoStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["info"] = "info"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    infoLines: List[str]
    youtubeVideoId: str | None = None


class PayoutStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["payout"] = "payout"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    currency: Currency
    payoutItems: List[DefaultPayoutItem | ChipPayoutItem | SurveyPayoutItem]
    averageAllPayoutItems: bool


class PrivateChatStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    kind: Literal["privateChat"] = "privateChat"
    name: str
    descriptions: Any
    progress: Any
    timeLimitInMinutes: float | None = None
    requireFullTime: bool | None = None
    isTurnBasedChat: bool | None = None
    minNumberOfTurns: float | None = None
    maxNumberOfTurns: float | None = None
    preventCancellation: bool | None = None


class ItemRankingStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["ranking"] = "ranking"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    rankingType: Literal["items"] = "items"
    strategy: Strategy
    rankingItems: List[RankingItem]


class ParticipantRankingStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["ranking"] = "ranking"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    rankingType: Literal["participants"] = "participants"
    strategy: Strategy
    enableSelfVoting: bool


class SalespersonStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    kind: Literal["salesperson"] = "salesperson"
    name: str
    descriptions: Any
    progress: Any


class ComparisonCondition(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: Literal["comparison"] = "comparison"
    target: ConditionTargetReference
    operator: ComparisonOperator = Field(..., title="ComparisonOperator")
    value: str | float | bool


class DefaultAutoTransferConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["default"] = "default"
    autoCohortParticipantConfig: CohortParticipantConfig
    minParticipants: conint(ge=1)
    maxParticipants: conint(ge=1)


class Persona(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    name: str
    defaultModelSettings: AgentModelSettings | None = None


class GoogleProviderOptions(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    thinkingConfig: GoogleThinkingConfig | None = None
    safetySettings: List[GoogleSafetySetting] | None = None


class AnthropicProviderOptions(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    thinking: AnthropicThinkingConfig | None = None
    effort: ReasoningEffort | None = Field(None, title="ReasoningEffort")
    cacheControl: AnthropicCacheControl | None = None
    sendReasoning: bool | None = None


class AssetAllocationStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["assetAllocation"] = "assetAllocation"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    stockConfig: StockConfig = Field(..., title="StockConfig")


class MultiAssetAllocationStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["multiAssetAllocation"] = "multiAssetAllocation"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    stockOptions: List[Stock]
    stockInfoStageId: str


class ComprehensionStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["comprehension"] = "comprehension"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    questions: List[TextQuestion | McQuestion]


class ProfileStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["profile"] = "profile"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    profileType: ProfileType


class RevealStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["reveal"] = "reveal"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    items: List[Any]


class RoleStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["role"] = "role"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    roles: List[Role]


class StockinfoStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["stockinfo"] = "stockinfo"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    stocks: List[Stock]
    showBestYearCard: bool
    showWorstYearCard: bool
    introText: str | None = None


class TosStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["tos"] = "tos"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    tosLines: List[str]


class RankingStageConfig(
    RootModel[ItemRankingStageConfig | ParticipantRankingStageConfig]
):
    root: ItemRankingStageConfig | ParticipantRankingStageConfig = Field(
        ..., title="RankingStageConfig"
    )


class ProviderOptionsMap(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    google: GoogleProviderOptions | None = None
    anthropic: AnthropicProviderOptions | None = None
    openai: OpenAIProviderOptions | None = None
    ollama: OllamaProviderOptions | None = None


class ModelGenerationConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    maxTokens: int | None = None
    stopSequences: List[str] | None = None
    temperature: float | None = None
    topP: float | None = None
    frequencyPenalty: float | None = None
    presencePenalty: float | None = None
    reasoningLevel: ReasoningLevel | None = Field(None, title="ReasoningLevel")
    reasoningBudget: int | None = None
    includeReasoning: bool | None = None
    disableSafetyFilters: bool | None = None
    providerOptions: ProviderOptionsMap | None = None
    customRequestBodyFields: List[CustomRequestBodyField] | None = None


class Experiment(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    versionId: float
    metadata: Metadata = Field(..., title="Metadata")
    permissions: Permissions = Field(..., title="Permissions")
    defaultCohortConfig: CohortParticipantConfig
    prolificConfig: ProlificConfig = Field(..., title="ProlificConfig")
    stageIds: List[str]
    cohortLockMap: Dict[constr(pattern=r"^(.*)$"), bool] = Field(
        ..., title="CohortLockMap"
    )
    variableConfigs: (
        List[
            StaticVariableConfig
            | RandomPermutationVariableConfig
            | BalancedAssignmentVariableConfig
        ]
        | None
    ) = None
    variableMap: Dict[constr(pattern=r"^(.*)$"), str] | None = Field(
        None, title="VariableMap"
    )
    cohortDefinitions: List[CohortDefinition] | None = None


class ExperimentTemplate(BaseModel):
    id: str
    experiment: Experiment = Field(..., title="Experiment")
    stageConfigs: List[
        AssetAllocationStageConfig
        | MultiAssetAllocationStageConfig
        | ChatStageConfig
        | ChipStageConfig
        | ComprehensionStageConfig
        | FlipCardStageConfig
        | InfoStageConfig
        | PayoutStageConfig
        | PrivateChatStageConfig
        | ProfileStageConfig
        | ItemRankingStageConfig
        | ParticipantRankingStageConfig
        | RevealStageConfig
        | RoleStageConfig
        | SalespersonStageConfig
        | StockinfoStageConfig
        | SurveyPerParticipantStageConfig
        | SurveyStageConfig
        | TosStageConfig
        | TransferStageConfig
    ]
    agentMediators: List[AgentMediatorTemplate]
    agentParticipants: List[AgentParticipantTemplate]


class ExperimentCreation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    collectionName: CollectionName
    experimentTemplate: ExperimentTemplate = Field(..., title="ExperimentTemplate")


class DeliberateLabAPISchemas(BaseModel):
    stage: (
        AssetAllocationStageConfig
        | MultiAssetAllocationStageConfig
        | ChatStageConfig
        | ChipStageConfig
        | ComprehensionStageConfig
        | FlipCardStageConfig
        | InfoStageConfig
        | PayoutStageConfig
        | PrivateChatStageConfig
        | ProfileStageConfig
        | ItemRankingStageConfig
        | ParticipantRankingStageConfig
        | RevealStageConfig
        | RoleStageConfig
        | SalespersonStageConfig
        | StockinfoStageConfig
        | SurveyPerParticipantStageConfig
        | SurveyStageConfig
        | TosStageConfig
        | TransferStageConfig
    )
    experimentCreation: ExperimentCreation = Field(..., title="ExperimentCreation")
    cohortCreation: CohortCreation = Field(..., title="CohortCreation")
    cohortUpdate: CohortUpdate = Field(..., title="CohortUpdate")


class SurveyPerParticipantStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["surveyPerParticipant"] = "surveyPerParticipant"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    questions: List[
        TextSurveyQuestion
        | CheckSurveyQuestion
        | MultipleChoiceSurveyQuestion
        | ScaleSurveyQuestion
    ]
    enableSelfSurvey: bool


class TextSurveyQuestion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["text"] = "text"
    questionTitle: str
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )
    minCharCount: float | None = None
    maxCharCount: float | None = None


class ConditionGroup(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: Literal["group"] = "group"
    operator: ConditionOperator = Field(..., title="ConditionOperator")
    conditions: List[ComparisonCondition | ConditionGroup]


class CheckSurveyQuestion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["check"] = "check"
    questionTitle: str
    isRequired: bool
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class MultipleChoiceSurveyQuestion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["mc"] = "mc"
    questionTitle: str
    options: List[MultipleChoiceItem]
    correctAnswerId: str | None = None
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class ScaleSurveyQuestion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["scale"] = "scale"
    questionTitle: str
    upperValue: float
    upperText: str
    lowerValue: float
    lowerText: str
    middleText: str | None = None
    useSlider: bool | None = None
    stepSize: confloat(ge=1.0) | None = None
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class SurveyStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["survey"] = "survey"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    questions: List[
        TextSurveyQuestion
        | CheckSurveyQuestion
        | MultipleChoiceSurveyQuestion
        | ScaleSurveyQuestion
    ]


class TransferStageConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    kind: Literal["transfer"] = "transfer"
    name: constr(min_length=1)
    descriptions: Any
    progress: Any
    enableTimeout: bool
    timeoutSeconds: float
    autoTransferConfig: (
        DefaultAutoTransferConfig
        | SurveyAutoTransferConfig
        | ConditionAutoTransferConfig
        | None
    ) = None


class ConditionAutoTransferConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["condition"] = "condition"
    autoCohortParticipantConfig: CohortParticipantConfig
    transferGroups: List[TransferGroup] = Field(..., min_length=1)


class TransferGroup(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    name: constr(min_length=1)
    composition: List[GroupComposition] = Field(..., min_length=1)
    targetCohortAlias: constr(min_length=1) | None = None


class GroupComposition(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    condition: ComparisonCondition | ConditionGroup = Field(..., title="Condition")
    minCount: conint(ge=1)
    maxCount: conint(ge=1)


class StaticVariableConfig(BaseModel):
    id: constr(min_length=1)
    type: Literal["static"] = "static"
    scope: Scope
    definition: VariableDefinition
    value: str
    cohortValues: Dict[constr(pattern=r"^(.*)$"), str] | None = Field(
        None, title="CohortValues"
    )


class Object(BaseModel):
    model_config = ConfigDict(
        extra="allow",
    )
    type: Literal["object"] = "object"
    properties: (
        Dict[
            constr(pattern=r"^(.*)$"),
            String | Number | Integer | Boolean | Object | Array,
        ]
        | None
    ) = Field(None, title="Properties")


class Array(BaseModel):
    model_config = ConfigDict(
        extra="allow",
    )
    type: Literal["array"] = "array"
    items: String | Number | Integer | Boolean | Object | Array | None = Field(
        None, title="JSONSchemaDefinition"
    )


class VariableDefinition(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: constr(min_length=1)
    description: str
    schema_: String | Number | Integer | Boolean | Object | Array = Field(
        ..., alias="schema", title="JSONSchemaDefinition"
    )


class RandomPermutationVariableConfig(BaseModel):
    id: constr(min_length=1)
    type: Literal["random_permutation"] = "random_permutation"
    scope: Scope
    definition: VariableDefinition
    shuffleConfig: ShuffleConfig
    values: List[str]
    numToSelect: confloat(ge=1.0) | None = None
    expandListToSeparateVariables: bool | None = None


class BalancedAssignmentVariableConfig(BaseModel):
    id: constr(min_length=1)
    type: Literal["balanced_assignment"] = "balanced_assignment"
    scope: Scope
    definition: VariableDefinition
    values: List[str]
    weights: List[confloat(ge=1.0)] | None = None
    balanceStrategy: BalanceStrategy
    balanceAcross: BalanceAcross


class AgentMediatorTemplate(BaseModel):
    persona: Persona
    promptMap: Dict[
        constr(pattern=r"^(.*)$"), ChatPromptConfig | GenericPromptConfig
    ] = Field(..., title="PromptMap")


class ChatPromptConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: ChatStageType = Field(..., title="ChatStageType")
    prompt: List[
        TextPromptItem
        | ProfileInfoPromptItem
        | ProfileContextPromptItem
        | StageContextPromptItem
        | PromptItemGroup
    ]
    includeScaffoldingInPrompt: bool | None = None
    numRetries: int | None = None
    generationConfig: ModelGenerationConfig | None = None
    structuredOutputConfig: (
        StructuredOutputConfig | ChatMediatorStructuredOutputConfig | None
    ) = None
    chatSettings: AgentChatSettings | None = None


class TextPromptItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["TEXT"] = "TEXT"
    text: str
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class ProfileInfoPromptItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["PROFILE_INFO"] = "PROFILE_INFO"
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class ProfileContextPromptItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["PROFILE_CONTEXT"] = "PROFILE_CONTEXT"
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class StageContextPromptItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["STAGE_CONTEXT"] = "STAGE_CONTEXT"
    stageId: str
    includePrimaryText: bool
    includeInfoText: bool
    includeHelpText: bool
    includeStageDisplay: bool
    includeParticipantAnswers: bool
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class PromptItemGroup(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["GROUP"] = "GROUP"
    title: str
    items: List[
        TextPromptItem
        | ProfileInfoPromptItem
        | ProfileContextPromptItem
        | StageContextPromptItem
        | PromptItemGroup
    ]
    shuffleConfig: ShuffleConfig | None = None
    condition: ComparisonCondition | ConditionGroup | None = Field(
        None, title="Condition"
    )


class StructuredOutputConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    enabled: bool
    type: StructuredOutputType = Field(..., title="StructuredOutputType")
    schema_: StructuredOutputSchema | None = Field(None, alias="schema")
    appendToPrompt: bool


class StructuredOutputSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: StructuredOutputDataType = Field(..., title="StructuredOutputDataType")
    description: str | None = None
    properties: List[StructuredOutputSchemaProperty] | None = None
    arrayItems: StructuredOutputSchema | None = None
    enumItems: List[str] | None = None


class StructuredOutputSchemaProperty(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str
    schema_: StructuredOutputSchema = Field(..., alias="schema")


class ChatMediatorStructuredOutputConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    enabled: bool
    type: StructuredOutputType = Field(..., title="StructuredOutputType")
    schema_: StructuredOutputSchema | None = Field(None, alias="schema")
    appendToPrompt: bool
    shouldRespondField: str
    messageField: str
    explanationField: str
    readyToEndField: str


class GenericPromptConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: StageKind = Field(..., title="StageKind")
    prompt: List[
        TextPromptItem
        | ProfileInfoPromptItem
        | ProfileContextPromptItem
        | StageContextPromptItem
        | PromptItemGroup
    ]
    includeScaffoldingInPrompt: bool | None = None
    numRetries: int | None = None
    generationConfig: ModelGenerationConfig | None = None
    structuredOutputConfig: StructuredOutputConfig | None = None


AgentParticipantTemplate = AgentMediatorTemplate


class JSONSchemaDefinition(
    RootModel[String | Number | Integer | Boolean | Object | Array]
):
    root: String | Number | Integer | Boolean | Object | Array = Field(
        ..., title="JSONSchemaDefinition"
    )


Experiment.model_rebuild()
ExperimentTemplate.model_rebuild()
DeliberateLabAPISchemas.model_rebuild()
SurveyPerParticipantStageConfig.model_rebuild()
TextSurveyQuestion.model_rebuild()
ConditionGroup.model_rebuild()
TransferStageConfig.model_rebuild()
ConditionAutoTransferConfig.model_rebuild()
TransferGroup.model_rebuild()
StaticVariableConfig.model_rebuild()
Object.model_rebuild()
Array.model_rebuild()
AgentMediatorTemplate.model_rebuild()
ChatPromptConfig.model_rebuild()
StructuredOutputConfig.model_rebuild()
StructuredOutputSchema.model_rebuild()
AgentParticipantTemplate.model_rebuild()
