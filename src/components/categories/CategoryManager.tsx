import { useMemo, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { CategoryRecord, CategoryType } from '../../types/category';

interface CategoryManagerProps {
  open: boolean;
  categories: CategoryRecord[];
  onClose: () => void;
  onCreateCategory: (name: string, type: CategoryType) => Promise<unknown>;
  onUpdateCategory: (id: number, name: string, type: CategoryType) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}

const TYPE_LABELS: Record<CategoryType, string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  both: 'Ambos',
};

export const CategoryManager = ({
  open,
  categories,
  onClose,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) => {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CategoryType>('both');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingType, setEditingType] = useState<CategoryType>('both');
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [categories],
  );

  const resetEditor = () => {
    setEditingId(null);
    setEditingName('');
    setEditingType('both');
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onCreateCategory(newName, newType);
      setNewName('');
      setNewType('both');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear la categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingId === null) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onUpdateCategory(editingId, editingName, editingType);
      resetEditor();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar la categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete?.id) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onDeleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      if (editingId === categoryToDelete.id) {
        resetEditor();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar la categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="dialog-backdrop" role="presentation">
        <section className="dialog-card category-manager" role="dialog" aria-modal="true" aria-label="Gestionar categorias">
          <header className="section-header">
            <h3>Gestionar categorias</h3>
            <button type="button" className="button button-secondary compact" onClick={onClose}>
              Cerrar
            </button>
          </header>

          <form className="category-create-form" onSubmit={handleCreate}>
            <input
              className="field"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nueva categoria"
              maxLength={40}
            />
            <select
              className="field"
              value={newType}
              onChange={(event) => setNewType(event.target.value as CategoryType)}
            >
              <option value="both">Ambos</option>
              <option value="gasto">Solo gastos</option>
              <option value="ingreso">Solo ingresos</option>
            </select>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              Agregar
            </button>
          </form>

          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

          <ul className="category-list">
            {sortedCategories.map((category) => {
              const isEditing = category.id === editingId;
              return (
                <li key={category.id} className="category-item">
                  {isEditing ? (
                    <div className="category-edit-grid">
                      <input
                        className="field"
                        type="text"
                        value={editingName}
                        maxLength={40}
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                      <select
                        className="field"
                        value={editingType}
                        onChange={(event) => setEditingType(event.target.value as CategoryType)}
                      >
                        <option value="both">Ambos</option>
                        <option value="gasto">Solo gastos</option>
                        <option value="ingreso">Solo ingresos</option>
                      </select>
                      <div className="actions-row compact">
                        <button
                          type="button"
                          className="button button-primary compact"
                          onClick={handleSaveEdit}
                          disabled={isSubmitting}
                        >
                          Guardar
                        </button>
                        <button type="button" className="button button-secondary compact" onClick={resetEditor}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="category-display">
                      <div>
                        <p className="category-name">{category.name}</p>
                        <p className="category-meta">
                          {TYPE_LABELS[category.type]}
                          {category.isDefault ? ' · Base' : ''}
                        </p>
                      </div>
                      <div className="actions-row compact">
                        <button
                          type="button"
                          className="button button-secondary compact"
                          onClick={() => {
                            setEditingId(category.id ?? null);
                            setEditingName(category.name);
                            setEditingType(category.type);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button-danger ghost compact"
                          onClick={() => setCategoryToDelete(category)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <ConfirmDialog
        open={categoryToDelete !== null}
        title="Eliminar categoria"
        description='Los movimientos de esta categoria se reasignaran automaticamente a "Otros".'
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </>
  );
};
