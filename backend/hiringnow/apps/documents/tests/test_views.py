"""Tests for Document API views."""

import pytest

from apps.documents.models import Document

DOCUMENT_URL = "/api/v1/documents/"


def _detail_url(doc_id):
    return f"/api/v1/documents/{doc_id}/"


# -- List -----------------------------------------------------------------


@pytest.mark.django_db
def test_list_documents_paginated(auth_client, employee):
    """GET /documents/ returns paginated envelope for admin."""
    Document.objects.create(
        title="Company Policy",
        file_url="https://example.com/policy.pdf",
        file_type="pdf",
        size=1024,
        uploaded_by=employee,
        category=Document.Category.POLICY,
        is_public=True,
    )
    response = auth_client.get(DOCUMENT_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_documents_filtered_by_category(auth_client, employee):
    """GET /documents/?category=POLICY returns only policy documents."""
    Document.objects.create(
        title="Policy Doc",
        file_url="https://example.com/policy.pdf",
        uploaded_by=employee,
        category=Document.Category.POLICY,
    )
    Document.objects.create(
        title="Contract Doc",
        file_url="https://example.com/contract.pdf",
        uploaded_by=employee,
        category=Document.Category.CONTRACT,
    )

    response = auth_client.get(DOCUMENT_URL, {"category": "POLICY"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["category"] == "POLICY"


# -- Create ---------------------------------------------------------------


@pytest.mark.django_db
def test_create_document(auth_client, employee):
    """POST /documents/ creates a document."""
    payload = {
        "title": "Offer Letter",
        "file_url": "https://example.com/offer.pdf",
        "file_type": "pdf",
        "size": 2048,
        "category": "CONTRACT",
        "is_public": False,
    }
    response = auth_client.post(DOCUMENT_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Offer Letter"
    assert data["category"] == "CONTRACT"
    assert data["is_public"] is False


@pytest.mark.django_db
def test_create_document_defaults(auth_client, employee):
    """POST /documents/ with minimal fields uses defaults."""
    payload = {
        "title": "Misc Document",
        "file_url": "https://example.com/misc.pdf",
    }
    response = auth_client.post(DOCUMENT_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["category"] == "OTHER"
    assert data["is_public"] is False


# -- Detail ---------------------------------------------------------------


@pytest.mark.django_db
def test_get_document_detail(auth_client, employee):
    """GET /documents/{id}/ returns single document."""
    doc = Document.objects.create(
        title="ID Proof",
        file_url="https://example.com/id.pdf",
        uploaded_by=employee,
        category=Document.Category.ID_PROOF,
    )
    response = auth_client.get(_detail_url(doc.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(doc.pk)
    assert response.json()["title"] == "ID Proof"


# -- Delete ---------------------------------------------------------------


@pytest.mark.django_db
def test_delete_document(auth_client, employee):
    """DELETE /documents/{id}/ deletes a document."""
    doc = Document.objects.create(
        title="Old Certificate",
        file_url="https://example.com/cert.pdf",
        uploaded_by=employee,
        category=Document.Category.CERTIFICATE,
    )
    response = auth_client.delete(_detail_url(doc.pk))
    assert response.status_code == 204
    assert not Document.objects.filter(pk=doc.pk).exists()


# -- Unauthenticated -----------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_documents_list(api_client):
    """Unauthenticated request to list returns 403."""
    response = api_client.get(DOCUMENT_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_documents_create(api_client):
    """Unauthenticated request to create returns 403."""
    payload = {
        "title": "Secret",
        "file_url": "https://example.com/secret.pdf",
    }
    response = api_client.post(DOCUMENT_URL, payload, format="json")
    assert response.status_code == 403
