import { 
    createAgentParticipantSurveyStagePrompt, 
    _createTextQuestionPrompt, 
    _createCheckQuestionPrompt, 
    _createMultipleChoiceQuestionPrompt, 
    _createScaleQuestionPrompt 
} from "./survey_stage.prompts";

import { 
    SurveyQuestionKind, 
    TextSurveyQuestion, 
    CheckSurveyQuestion, 
    MultipleChoiceSurveyQuestion, 
    ScaleSurveyQuestion
} from "./survey_stage";

describe("Survey Prompt Functions", () => {
    test("_createTextQuestionPrompt should include question title", () => {
        const question: TextSurveyQuestion = { id: "q1", kind: SurveyQuestionKind.TEXT, questionTitle: "What is your name?" };
        expect(_createTextQuestionPrompt(question)).toContain("What is your name?");
    });

    test("_createCheckQuestionPrompt should include question title", () => {
        const question: CheckSurveyQuestion = { id: "q2", kind: SurveyQuestionKind.CHECK, questionTitle: "Do you agree?", isRequired: true };
        expect(_createCheckQuestionPrompt(question)).toContain("Do you agree?");
    });

    test("_createMultipleChoiceQuestionPrompt should include question title and options", () => {
        const question: MultipleChoiceSurveyQuestion = { 
            id: "q3",
            kind: SurveyQuestionKind.MULTIPLE_CHOICE, 
            questionTitle: "Choose a color", 
            correctAnswerId: "id1",
            options: [{id: "id1", text: "Red", imageId: "image-id1"},
                 {id: "id2", text: "Blue", imageId: "image-id2"}, 
                 {id: "id3", text: "Green", imageId: "image-id3"}] 
        };
        const prompt = _createMultipleChoiceQuestionPrompt(question);
        expect(prompt).toContain("Choose a color");
        expect(prompt).toContain("Red");
        expect(prompt).toContain("Blue");
        expect(prompt).toContain("Green");
    });

    test("_createScaleQuestionPrompt should include question title and scale values", () => {
        const question: ScaleSurveyQuestion = { 
            id: "q4",
            kind: SurveyQuestionKind.SCALE, 
            questionTitle: "Rate your experience", 
            lowerValue: 1, 
            lowerText: "Bad", 
            upperValue: 5, 
            upperText: "Excellent" 
        };
        const prompt = _createScaleQuestionPrompt(question);
        expect(prompt).toContain("Rate your experience");
        expect(prompt).toContain("1");
        expect(prompt).toContain("Bad");
        expect(prompt).toContain("5");
        expect(prompt).toContain("Excellent");
    });

    test("createAgentParticipantSurveyStagePrompt should include all question prompts", () => {
        const questions = [
            { id: "q5", kind: SurveyQuestionKind.TEXT, questionTitle: "What is your name?" },
            { id: "q6", kind: SurveyQuestionKind.CHECK, questionTitle: "Do you agree?" }
        ];
        const prompt = createAgentParticipantSurveyStagePrompt(questions);
        expect(prompt).toContain("What is your name?");
        expect(prompt).toContain("Do you agree?");
    });

    test("createAgentParticipantSurveyStagePrompt should return empty string for empty input", () => {
        expect(createAgentParticipantSurveyStagePrompt([])).toBe("");
    });
});
