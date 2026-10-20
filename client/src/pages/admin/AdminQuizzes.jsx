import { useState } from 'react';
import { api } from '../../api/client.js';
import { Loader, Modal, useFetch } from '../../components/ui.jsx';

const newQuestion = () => ({ question: '', options: ['', '', '', ''], correct_index: 0, explanation: '' });

function QuizEditor({ initial, courses, onClose, onSaved }) {
  const [quiz, setQuiz] = useState(initial);
  const [lessons, setLessons] = useState([]);
  const [gen, setGen] = useState({ lesson_id: '', count: 5, busy: false });
  const [error, setError] = useState('');

  const pickCourse = async (course_id) => {
    setQuiz({ ...quiz, course_id });
    setLessons(course_id ? (await api.get(`/courses/${course_id}`)).lessons : []);
  };
  const updateQ = (i, patch) => setQuiz({ ...quiz, questions: quiz.questions.map((q, qi) => (qi === i ? { ...q, ...patch } : q)) });

  const generate = async () => {
    setGen({ ...gen, busy: true });
    try {
      const { questions } = await api.post('/quizzes/generate', { lesson_id: gen.lesson_id, count: gen.count });
      const blank = quiz.questions.length === 1 && !quiz.questions[0].question;
      setQuiz({ ...quiz, questions: [...(blank ? [] : quiz.questions), ...questions] });
    } catch (err) {
      setError(err.message);
    }
    setGen((g) => ({ ...g, busy: false }));
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...quiz, questions: quiz.questions.map((q) => ({ ...q, correct_index: Number(q.correct_index) })) };
      if (quiz.id) await api.put(`/quizzes/${quiz.id}`, body);
      else await api.post('/quizzes', body);
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title={quiz.id ? 'Sửa bài trắc nghiệm' : 'Tạo bài trắc nghiệm'} onClose={onClose}>
      <form onSubmit={save}>
        {error && <div className="alert error">{error}</div>}
        {!quiz.id && (
          <label>
            Khóa học
            <select required value={quiz.course_id} onChange={(e) => pickCourse(e.target.value)}>
              <option value="">-- Chọn khóa học --</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
        )}
        <label>Tiêu đề<input required value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} /></label>

        {lessons.length > 0 && (
          <div className="ai-box">
            <b>🤖 Sinh câu hỏi tự động bằng AI từ bài học</b>
            <div className="toolbar">
              <select value={gen.lesson_id} onChange={(e) => setGen({ ...gen, lesson_id: e.target.value })}>
                <option value="">-- Chọn bài học --</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
              <input type="number" min={1} max={15} value={gen.count} onChange={(e) => setGen({ ...gen, count: e.target.value })} style={{ width: 70 }} />
              <button type="button" className="btn" disabled={!gen.lesson_id || gen.busy} onClick={generate}>
                {gen.busy ? 'Đang sinh…' : 'Sinh câu hỏi'}
              </button>
            </div>
          </div>
        )}

        {quiz.questions.map((q, i) => (
          <fieldset key={i} className="question-edit">
            <legend>
              Câu {i + 1}{' '}
              <button type="button" className="link small" onClick={() => setQuiz({ ...quiz, questions: quiz.questions.filter((_, qi) => qi !== i) })}>
                Xóa
              </button>
            </legend>
            <input required placeholder="Nội dung câu hỏi" value={q.question} onChange={(e) => updateQ(i, { question: e.target.value })} />
            {q.options.map((o, oi) => (
              <label key={oi} className="option">
                <input type="radio" name={`correct${i}`} checked={Number(q.correct_index) === oi} onChange={() => updateQ(i, { correct_index: oi })} title="Đáp án đúng" />
                <input required placeholder={`Lựa chọn ${oi + 1}`} value={o} onChange={(e) => updateQ(i, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} />
              </label>
            ))}
            <input placeholder="Giải thích (tùy chọn)" value={q.explanation || ''} onChange={(e) => updateQ(i, { explanation: e.target.value })} />
          </fieldset>
        ))}
        <div className="row-between">
          <button type="button" className="btn" onClick={() => setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion()] })}>
            + Thêm câu hỏi
          </button>
          <button className="btn primary">Lưu ({quiz.questions.length} câu)</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminQuizzes() {
  const state = useFetch(() => api.get('/quizzes'));
  const courses = useFetch(() => api.get('/courses'));
  const [editing, setEditing] = useState(null);

  const edit = async (q) => setEditing(await api.get(`/quizzes/${q.id}`));
  const remove = async (q) => {
    if (!window.confirm(`Xóa "${q.title}"?`)) return;
    await api.del(`/quizzes/${q.id}`);
    state.reload();
  };

  return (
    <>
      <div className="row-between">
        <h1>❓ Bài kiểm tra trắc nghiệm</h1>
        <button className="btn primary" onClick={() => setEditing({ course_id: '', title: '', questions: [newQuestion()] })}>
          + Tạo bài trắc nghiệm
        </button>
      </div>
      <Loader state={state}>
        {(rows) => (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Khóa học</th>
                  <th>Số câu</th>
                  <th>Lượt làm</th>
                  <th>Điểm TB</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id}>
                    <td>{q.title}</td>
                    <td>{q.course_title}</td>
                    <td>{q.question_count}</td>
                    <td>{q.attempt_count}</td>
                    <td>{q.avg_score ?? '—'}</td>
                    <td className="actions">
                      <button className="btn small" onClick={() => edit(q)}>Sửa</button>
                      <button className="btn small danger" onClick={() => remove(q)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
      {editing && (
        <QuizEditor
          initial={editing}
          courses={courses.data || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}
