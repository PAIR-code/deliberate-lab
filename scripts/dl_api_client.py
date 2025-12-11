# pylint: disable=line-too-long
"""
Deliberate Lab REST API Client

Simple Python client for interacting with the Deliberate Lab API.

Usage:
    Set the DL_API_KEY environment variable with your API key, then:

    from dl_api_client import DeliberateLabClient, dl

    client = DeliberateLabClient()

    # List experiments
    experiments = client.list_experiments()

    # Create experiment with typed stage configs
    stage = dl.SurveyStageConfig(
        id="survey1",
        kind="survey",
        name="Demographics",
        descriptions=dl.StageTextConfig(primaryText="Please answer", infoText="", helpText=""),
        progress=dl.StageProgressConfig(minParticipants=1, waitForAllParticipants=False, showParticipantProgress=False),
        questions=[
            dl.TextSurveyQuestion(id="q1", kind="text", questionTitle="What is your name?")
        ]
    )
    client.create_experiment(name="My Study", stages=[stage])
"""

from __future__ import annotations
from typing import Optional, TYPE_CHECKING
import os
import requests

# Import types module - use as `dl.SurveyStageConfig`, `dl.TextSurveyQuestion`, etc.
import dl_api_types as dl  # noqa: F401  # pylint: disable=unused-import

if TYPE_CHECKING:
    from pydantic import BaseModel


class DeliberateLabAPIError(requests.HTTPError):
    """Exception raised for API errors with parsed error message."""

    def __init__(self, response: requests.Response, message: str):
        self.message = message
        super().__init__(
            f"API Error ({response.status_code}): {message}", response=response
        )


class DeliberateLabClient:
    """Client for the Deliberate Lab REST API."""

    DEFAULT_BASE_URL = "https://us-central1-deliberate-lab.cloudfunctions.net/api/v1"

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 60.0,
    ):
        """
        Initialize the client.

        Args:
            api_key: API key for authentication. If not provided, reads from
                     DL_API_KEY environment variable.
            base_url: Base URL for the API. Defaults to production URL.
            timeout: Request timeout in seconds. Defaults to 60, longer for exports.
        """
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.api_key = api_key or os.environ.get("DL_API_KEY")
        self.timeout = timeout
        if not self.api_key:
            raise ValueError(
                "API key required. Pass api_key parameter or set DL_API_KEY env var."
            )
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        )

    def _handle_response(self, response: requests.Response) -> dict:
        """Handle API response and raise errors if needed."""
        if response.status_code >= 400:
            try:
                error_msg = response.json().get("error", response.text)
            except ValueError:
                error_msg = response.text
            raise DeliberateLabAPIError(response, error_msg)
        return response.json()

    def health_check(self) -> dict:
        """Check API health status."""
        response = self._session.get(f"{self.base_url}/health", timeout=self.timeout)
        return self._handle_response(response)

    def list_experiments(self) -> dict:
        """
        List all experiments for the authenticated user.

        Returns:
            dict with 'experiments' list and 'total' count
        """
        response = self._session.get(
            f"{self.base_url}/experiments", timeout=self.timeout
        )
        return self._handle_response(response)

    def get_experiment(self, experiment_id: str) -> dict:
        """
        Get a specific experiment by ID.

        Args:
            experiment_id: The experiment ID

        Returns:
            dict with 'experiment', 'stageMap', 'agentMediatorMap', 'agentParticipantMap'
        """
        response = self._session.get(
            f"{self.base_url}/experiments/{experiment_id}", timeout=self.timeout
        )
        return self._handle_response(response)

    def create_experiment(
        self,
        name: str,
        description: Optional[str] = None,
        stages: Optional[list[BaseModel]] = None,
        prolific_redirect_code: Optional[str] = None,
    ) -> dict:
        """
        Create a new experiment.

        Args:
            name: Experiment name (required)
            description: Optional description
            stages: Optional list of stage configurations (use typed StageConfig classes)
            prolific_redirect_code: Optional Prolific redirect code

        Returns:
            dict with created experiment data including 'id'

        Example:
            stage = dl.SurveyStageConfig(
                id="survey1",
                kind="survey",
                name="Demographics",
                descriptions=dl.StageTextConfig(primaryText="Answer", infoText="", helpText=""),
                progress=dl.StageProgressConfig(minParticipants=1, waitForAllParticipants=False, showParticipantProgress=False),
                questions=[dl.TextSurveyQuestion(id="q1", kind="text", questionTitle="Name?")]
            )
            client.create_experiment(name="My Study", stages=[stage])
        """
        data: dict = {"name": name}
        if description is not None:
            data["description"] = description
        if stages is not None:
            # Convert Pydantic models to dicts for JSON serialization
            data["stages"] = [
                s.model_dump(by_alias=True, exclude_none=True) for s in stages
            ]
        if prolific_redirect_code is not None:
            data["prolificRedirectCode"] = prolific_redirect_code

        response = self._session.post(
            f"{self.base_url}/experiments", json=data, timeout=self.timeout
        )
        return self._handle_response(response)

    def update_experiment(
        self,
        experiment_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        stages: Optional[list[BaseModel]] = None,
        prolific_redirect_code: Optional[str] = None,
    ) -> dict:
        """
        Update an existing experiment.

        Args:
            experiment_id: The experiment ID to update
            name: Optional new name
            description: Optional new description
            stages: Optional new list of stage configurations (use typed StageConfig classes)
            prolific_redirect_code: Optional new Prolific redirect code

        Returns:
            dict with 'updated' bool and 'id'
        """
        data: dict = {}
        if name is not None:
            data["name"] = name
        if description is not None:
            data["description"] = description
        if stages is not None:
            data["stages"] = [
                s.model_dump(by_alias=True, exclude_none=True) for s in stages
            ]
        if prolific_redirect_code is not None:
            data["prolificRedirectCode"] = prolific_redirect_code

        response = self._session.put(
            f"{self.base_url}/experiments/{experiment_id}",
            json=data,
            timeout=self.timeout,
        )
        return self._handle_response(response)

    def delete_experiment(self, experiment_id: str) -> dict:
        """
        Delete an experiment.

        Args:
            experiment_id: The experiment ID to delete

        Returns:
            dict with 'deleted' bool and 'id'
        """
        response = self._session.delete(
            f"{self.base_url}/experiments/{experiment_id}", timeout=self.timeout
        )
        return self._handle_response(response)

    def export_experiment(self, experiment_id: str) -> dict:
        """
        Export full experiment data including participants.

        Args:
            experiment_id: The experiment ID to export

        Returns:
            Full ExperimentDownload structure with experiment, stages,
            cohorts, participants, agents, and chat data
        """
        response = self._session.get(
            f"{self.base_url}/experiments/{experiment_id}/export",
            timeout=(self.timeout * 3),  # Allow more time for exports
        )
        return self._handle_response(response)


if __name__ == "__main__":
    # Quick test - requires DL_API_KEY to be set
    try:
        client = DeliberateLabClient()

        print("Checking API health...")
        health = client.health_check()
        print(f"API Status: {health['status']}")

        print("\nListing experiments...")
        result = client.list_experiments()
        print(f"Found {result['total']} experiments")

        for exp in result["experiments"][:5]:  # Show first 5
            print(f"  - {exp['metadata']['name']} ({exp['id']})")

    except DeliberateLabAPIError as e:
        print(f"API Error: {e}")
    except ValueError as e:
        print(f"Configuration Error: {e}")
