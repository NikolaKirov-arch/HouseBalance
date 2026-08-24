import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import ExpenseTable from '../components/ExpenseTable';
import Loading from '../components/Loading';

export default function ExpensesPage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const isAdmin = group.current_member.role === 'admin';
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ message: '', type: 'danger' });

  async function loadData() {
    const [expenseData, categoryData] = await Promise.all([
      apiFetch(`/groups/${groupId}/expenses`),
      apiFetch(`/groups/${groupId}/categories`)
    ]);
    setExpenses(expenseData.expenses);
    setCategories(categoryData.categories);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch(`/groups/${groupId}/expenses`),
      apiFetch(`/groups/${groupId}/categories`)
    ])
      .then(([expenseData, categoryData]) => {
        if (active) {
          setExpenses(expenseData.expenses);
          setCategories(categoryData.categories);
        }
      })
      .catch((requestError) => { if (active) setAlert({ message: requestError.message, type: 'danger' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  async function deleteExpense(expense) {
    const confirmed = window.confirm(`Delete the expense "${expense.description || `#${expense.id}`}"? Balances will be recalculated.`);
    if (!confirmed) return;

    setAlert({ message: '', type: 'danger' });
    try {
      await apiFetch(`/groups/${groupId}/expenses/${expense.id}`, { method: 'DELETE' });
      await loadData();
      setAlert({ message: 'Expense deleted. Current balances now reflect the remaining records.', type: 'success' });
    } catch (requestError) {
      setAlert({ message: requestError.message, type: 'danger' });
    }
  }

  async function createCategory(event) {
    event.preventDefault();
    setAlert({ message: '', type: 'danger' });
    try {
      await apiFetch(`/groups/${groupId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: categoryName })
      });
      setCategoryName('');
      await loadData();
      setAlert({ message: 'Expense category created.', type: 'success' });
    } catch (requestError) {
      setAlert({ message: requestError.message, type: 'danger' });
    }
  }

  async function deactivateCategory(category) {
    setAlert({ message: '', type: 'danger' });
    try {
      await apiFetch(`/groups/${groupId}/categories/${category.id}/deactivate`, { method: 'PATCH' });
      await loadData();
      setAlert({ message: `${category.name} was deactivated. Existing expense history was preserved.`, type: 'success' });
    } catch (requestError) {
      setAlert({ message: requestError.message, type: 'danger' });
    }
  }

  if (loading) return <Loading text="Loading expenses..." />;

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div><h2 className="h4 mb-1">Expenses</h2><p className="text-secondary mb-0">Every expense shows its payer, participants, and owed amounts.</p></div>
        <Link className="btn btn-primary" to={`/groups/${groupId}/expenses/new`}>Add expense</Link>
      </div>
      <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert({ message: '', type: 'danger' })} />

      <section className="card shadow-sm border-0 mb-4">
        <div className="card-body p-0"><ExpenseTable expenses={expenses} currency={group.currency} onDelete={deleteExpense} /></div>
      </section>

      <section className="card shadow-sm border-0">
        <div className="card-header bg-white"><h3 className="h5 mb-0">Expense categories</h3></div>
        <div className="card-body">
          {isAdmin ? (
            <form className="row g-2 mb-3" onSubmit={createCategory}>
              <div className="col-md-8"><label className="visually-hidden" htmlFor="category-name">Category name</label><input id="category-name" className="form-control" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category name" required /></div>
              <div className="col-md-4 d-grid"><button className="btn btn-outline-primary" type="submit">Create category</button></div>
            </form>
          ) : null}
          <div className="d-flex flex-wrap gap-2">
            {categories.map((category) => (
              <div className={`category-chip ${category.is_active ? '' : 'inactive'}`} key={category.id}>
                <span>{category.name}</span>
                {category.is_default ? <span className="small text-secondary">default</span> : null}
                {!category.is_active ? <span className="badge text-bg-secondary">inactive</span> : null}
                {isAdmin && category.is_active ? <button className="btn btn-link btn-sm text-danger p-0" type="button" onClick={() => deactivateCategory(category)}>Deactivate</button> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

