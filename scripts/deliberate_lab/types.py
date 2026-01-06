# pyright: reportInvalidTypeForm=false
# pylint: disable=missing-module-docstring,missing-class-docstring,invalid-name,too-few-public-methods

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel, confloat, constr


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
    minParticipantsPerCohort: confloat(ge=0.0) | None = None
    maxParticipantsPerCohort: confloat(ge=1.0) | None = None
    includeAllParticipantsInCohortCount: bool
    botProtection: bool


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


class Persona(BaseModel):
    id: constr(min_length=1)
    name: str


class AgentMediatorTemplate(BaseModel):
    persona: Persona = Field(..., title="Persona")
    promptMap: Dict[constr(pattern=r"^(.*)$"), Dict[str, Any]] = Field(
        ..., title="PromptMap"
    )


AgentParticipantTemplate = AgentMediatorTemplate


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
    minParticipants: float
    maxParticipants: float | None = None


class StageProgressConfig(RootModel[Any]):
    root: Any


class StageTextConfig(StageProgressConfig):
    pass


class CohortConfig(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
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


class ComparisonCondition(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: constr(min_length=1)
    type: Literal["comparison"] = "comparison"
    target: ConditionTargetReference
    operator: ComparisonOperator = Field(..., title="ComparisonOperator")
    value: str | float | bool


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


class PrivateChatStageConfig(BaseModel):
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


class SalespersonStageConfig(BaseModel):
    id: str
    kind: Literal["salesperson"] = "salesperson"
    name: str
    descriptions: Any
    progress: Any


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


class RankingStageConfig(
    RootModel[ItemRankingStageConfig | ParticipantRankingStageConfig]
):
    root: ItemRankingStageConfig | ParticipantRankingStageConfig = Field(
        ..., title="RankingStageConfig"
    )


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


class StaticVariableConfig(BaseModel):
    id: constr(min_length=1)
    type: Literal["static"] = "static"
    scope: Scope
    definition: VariableDefinition
    value: str


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
    shuffleConfig: ShuffleConfig = Field(..., title="ShuffleConfig")
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
StaticVariableConfig.model_rebuild()
Object.model_rebuild()
Array.model_rebuild()
