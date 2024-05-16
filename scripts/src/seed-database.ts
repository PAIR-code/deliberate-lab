import { Timestamp } from "firebase-admin/firestore";
import admin, { initializeApp } from "./admin";

initializeApp();

const seedDatabase = async () => {
  const db = admin.firestore();

  await db.runTransaction(async (transaction) => {
    // Create templates
    transaction.set(db.collection("templates").doc(), DEFAULT_TEMPLATE);

    // Create participants
    DEFAULT_PARTICIPANTS.forEach((participant, index) => {
      transaction.set(
        db.collection("participants").doc(`participant-${index}`),
        participant
      );
    });

    // Create experiment
    transaction.set(
      db.collection("experiments").doc("default-experiment-id"),
      DEFAULT_EXPERIMENT
    );

    // Create synchronization collections
    // Create their progression data in a separate collection (for synchronization purposes)
    transaction.set(
      db.collection("participants_progressions").doc("default-experiment-id"),
      {
        experimentId: "default-experiment-id",
        progressions: {
          "participant-0": "1. Agree to the experiment and set your profile",
          "participant-1": "1. Agree to the experiment and set your profile",
          "participant-2": "1. Agree to the experiment and set your profile",
        },
      }
    );

    // Create the `ready_to_end_chat` entry for synchronization purposes
    transaction.set(
      db.collection("participants_ready_to_end_chat").doc("default-chat-id"),
      {
        chatId: "default-chat-id",
        readyToEndChat: {
          "participant-0": false,
          "participant-1": false,
          "participant-2": false,
        },
        currentPair: 0,
      }
    );
  });

  console.log("Done !");
};

// ********************************************************************************************* //
//                                         SEEDER DATA                                           //
// ********************************************************************************************* //

// Note that this data is hardcoded for now, because the db structure will change in order to be more practical.

const DEFAULT_STAGES = [
  {
    kind: "acceptTosAndSetProfile",
    name: "1. Agree to the experiment and set your profile",
    config: {
      pronouns: "",
      avatarUrl: "",
      name: "",
      tosLines: [],
      acceptedTosTimestamp: null,
    },
  },
  {
    kind: "takeSurvey",
    name: "2. Initial leadership survey",
    config: {
      questions: [
        {
          kind: "RatingQuestion",
          id: "1",
          questionText:
            "Rate the items by how helpful they would be for survival.",
          item1: {
            name: "compas",
            imageUrl:
              "https://m.media-amazon.com/images/I/81NUeKWdiQL._AC_UF1000,1000_QL80_.jpg",
          },
          item2: {
            name: "blanket",
            imageUrl:
              "https://img.freepik.com/free-psd/blanket-isolated-transparent-background_191095-10098.jpg?size=338&ext=jpg&ga=GA1.1.1700460183.1712448000&semt=sph",
          },
          choice: null,
          confidence: null,
        },
        {
          kind: "ScaleQuestion",
          id: "2",
          questionText:
            "Rate the how much you would like to be the group leader.",
          lowerBound:
            "I would most definitely not like to be the leader (0/10)",
          upperBound: "I will fight to be the leader (10/10)",
          score: null,
        },
      ],
    },
  },
  {
    kind: "groupChat",
    name: "3. Group discussion",
    config: {
      chatId: "default-chat-id",
      ratingsToDiscuss: [
        { id1: 0, id2: 1 },
        { id1: 1, id2: 2 },
        { id1: 0, id2: 2 },
      ],
      messages: [],
      items: [
        {
          name: "compas",
          imageUrl:
            "https://m.media-amazon.com/images/I/81NUeKWdiQL._AC_UF1000,1000_QL80_.jpg",
        },
        {
          name: "blanket",
          imageUrl:
            "https://img.freepik.com/free-psd/blanket-isolated-transparent-background_191095-10098.jpg?size=338&ext=jpg&ga=GA1.1.1700460183.1712448000&semt=sph",
        },
        {
          name: "lighter",
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/White_lighter_with_flame.JPG/1200px-White_lighter_with_flame.JPG",
        },
      ],
      readyToEndChat: false,
      isSilent: true,
    },
  },
  {
    kind: "takeSurvey",
    name: "4. Post-chat survey",
    config: {
      questions: [
        {
          kind: "ScaleQuestion",
          id: "3",
          questionText:
            "Rate the chat dicussion on a 1-10 scale.\nAlso indicate your overall feeling about the chat.",
          lowerBound: "I did not enjoy the discussion at all (0/10)",
          upperBound: "The dicussion was a perfect experience to me (10/10)",
          score: null,
        },
      ],
    },
  },
  {
    kind: "takeSurvey",
    name: "5. Post-discussion leadership survey",
    config: {
      questions: [
        {
          kind: "ScaleQuestion",
          id: "4",
          questionText:
            "Rate the how much you would like to be the group leader.",
          lowerBound:
            "I would most definitely not like to be the leader (0/10)",
          upperBound: "I will fight to be the leader (10/10)",
          score: null,
        },
      ],
    },
  },
  {
    kind: "voteForLeader",
    name: "6. Vote for the leader",
    config: {
      votes: {
        "participant-0": "not-rated",
        "participant-1": "not-rated",
        "participant-2": "not-rated",
      },
    },
  },
  {
    kind: "takeSurvey",
    name: "7. Post-discussion work",
    config: {
      questions: [
        {
          kind: "RatingQuestion",
          id: "5",
          questionText:
            "Please rating the following accoring to which is best for survival",
          item1: {
            name: "compas",
            imageUrl:
              "https://m.media-amazon.com/images/I/81NUeKWdiQL._AC_UF1000,1000_QL80_.jpg",
          },
          item2: {
            name: "blanket",
            imageUrl:
              "https://img.freepik.com/free-psd/blanket-isolated-transparent-background_191095-10098.jpg?size=338&ext=jpg&ga=GA1.1.1700460183.1712448000&semt=sph",
          },
          choice: null,
          confidence: null,
        },
      ],
    },
  },
  {
    kind: "leaderReveal",
    name: "8. Leader reveal",
    config: {
      pendingVoteStageName: "6. Vote for the leader",
      revealTimestamp: null,
    },
  },
  {
    kind: "takeSurvey",
    name: "9. final satisfaction survey",
    config: {
      questions: [
        {
          kind: "ScaleQuestion",
          id: "6",
          questionText:
            "Rate how happy you were with the final outcome.\nAlso indicate your overall feeling about the experience.",
          lowerBound: "I was most definitely disappointed (0/10)",
          upperBound: "I was very happy (10/10)",
          score: null,
        },
      ],
    },
  },
];

const DEFAULT_STAGE_MAP = DEFAULT_STAGES.reduce((acc, stage) => {
  acc[stage.name] = stage;
  return acc;
}, {} as Record<string, any>);

const DEFAULT_TEMPLATE = {
  name: "Default template",
  stageMap: DEFAULT_STAGE_MAP,
  allowedStageProgressionMap: {
    "1. Agree to the experiment and set your profile": false,
    "2. Initial leadership survey": true,
    "3. Group discussion": false,
    "4. Post-chat survey": true,
    "5. Post-discussion leadership survey": true,
    "6. Vote for the leader": true,
    "7. Post-discussion work": true,
    "8. Leader reveal": false,
    "9. final satisfaction survey": true,
  },
};

const DEFAULT_PARTICIPANTS = [
  {
    experimentId: "default-experiment-id",
    stageMap: DEFAULT_STAGE_MAP,
    allowedStageProgressionMap: {
      "1. Agree to the experiment and set your profile": false,
      "2. Initial leadership survey": true,
      "3. Group discussion": false,
      "4. Post-chat survey": true,
      "5. Post-discussion leadership survey": true,
      "6. Vote for the leader": true,
      "7. Post-discussion work": true,
      "8. Leader reveal": false,
      "9. final satisfaction survey": true,
    },
    acceptTosTimestamp: null,
    futureStageNames: [
      "2. Initial leadership survey",
      "3. Group discussion",
      "4. Post-chat survey",
      "5. Post-discussion leadership survey",
      "6. Vote for the leader",
      "7. Post-discussion work",
      "8. Leader reveal",
      "9. final satisfaction survey",
    ],
    workingOnStageName: "1. Agree to the experiment and set your profile",
    completedStageNames: [],
    name: "Sebulba",
    pronouns: null,
    avatarUrl: null,
  },
  {
    experimentId: "default-experiment-id",
    stageMap: DEFAULT_STAGE_MAP,
    allowedStageProgressionMap: {
      "1. Agree to the experiment and set your profile": false,
      "2. Initial leadership survey": true,
      "3. Group discussion": false,
      "4. Post-chat survey": true,
      "5. Post-discussion leadership survey": true,
      "6. Vote for the leader": true,
      "7. Post-discussion work": true,
      "8. Leader reveal": false,
      "9. final satisfaction survey": true,
    },
    acceptTosTimestamp: null,
    futureStageNames: [
      "2. Initial leadership survey",
      "3. Group discussion",
      "4. Post-chat survey",
      "5. Post-discussion leadership survey",
      "6. Vote for the leader",
      "7. Post-discussion work",
      "8. Leader reveal",
      "9. final satisfaction survey",
    ],
    workingOnStageName: "1. Agree to the experiment and set your profile",
    completedStageNames: [],
    name: "Quarsh Panaka",
    pronouns: null,
    avatarUrl: null,
  },
  {
    experimentId: "default-experiment-id",
    stageMap: DEFAULT_STAGE_MAP,
    allowedStageProgressionMap: {
      "1. Agree to the experiment and set your profile": false,
      "2. Initial leadership survey": true,
      "3. Group discussion": false,
      "4. Post-chat survey": true,
      "5. Post-discussion leadership survey": true,
      "6. Vote for the leader": true,
      "7. Post-discussion work": true,
      "8. Leader reveal": false,
      "9. final satisfaction survey": true,
    },
    acceptTosTimestamp: null,
    futureStageNames: [
      "2. Initial leadership survey",
      "3. Group discussion",
      "4. Post-chat survey",
      "5. Post-discussion leadership survey",
      "6. Vote for the leader",
      "7. Post-discussion work",
      "8. Leader reveal",
      "9. final satisfaction survey",
    ],
    workingOnStageName: "1. Agree to the experiment and set your profile",
    completedStageNames: [],
    name: "Wedge Antilles",
    pronouns: null,
    avatarUrl: null,
  },
];

const DEFAULT_EXPERIMENT = {
  name: "Example experiment",
  date: Timestamp.now(),
  numberOfParticipants: 3,
};

seedDatabase().catch(console.error);
